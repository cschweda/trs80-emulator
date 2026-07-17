/**
 * WD1793 Floppy Disk Controller (Model III disk subsystem)
 *
 * Ports (handled by IOSystem):
 *   0xF0 status (R) / command (W)     0xF2 sector register
 *   0xF1 track register               0xF3 data register
 *   0xF4 (W) drive select: bits 0-3 drive, bit 4 side, bit 7 MFM
 *
 * Implements what the boot ROM and LDOS/TRSDOS-class DOSes use: Type I
 * RESTORE/SEEK/STEP, Type II READ/WRITE SECTOR with a DRQ byte pump,
 * Type III READ ADDRESS, Type IV FORCE INTERRUPT. Command completion is
 * delayed in emulated T-states via tick(); INTRQ is exposed for the
 * 0xE4 NMI latch. Sector data comes from DiskImage objects attached per
 * drive.
 */

// Status bits (Type I / common)
const ST_BUSY = 0x01;
const ST_INDEX = 0x02; // Type I: index pulse
const ST_DRQ = 0x02; // Type II/III: data request
const ST_TRACK0 = 0x04;
const ST_CRC_ERROR = 0x08;
const ST_RNF = 0x10; // record not found / seek error
const ST_HEAD_LOADED = 0x20;
const ST_RECORD_TYPE = 0x20; // Type II read: deleted data mark (0xF8)
const ST_WRITE_PROTECT = 0x40;
const ST_NOT_READY = 0x80;

// Index hole: 300 rpm = one pulse per 405,504 T-states, ~6k wide
const INDEX_PERIOD = 405504;
const INDEX_WIDTH = 8000;

const COMPLETION_DELAY = 12000; // T-states for Type I/II command spin-up

export class FDC1793 {
  constructor() {
    this.drives = [null, null, null, null]; // DiskImage or null
    this.selected = 0;
    this.side = 0;

    this.trackReg = 0;
    this.sectorReg = 0;
    this.dataReg = 0;
    this.physicalTrack = [0, 0, 0, 0];

    this.status = 0;
    this.intrq = false;
    this.commandType = 1;

    // In-flight operation
    this.pending = null; // { kind, delay }
    this.buffer = null; // Uint8Array being pumped
    this.bufferPos = 0;
    this.writing = false;
    this.writeDeleted = false; // WRITE SECTOR bit a0: write a 0xF8 DAM

    this.indexClock = 0;
  }

  attachDrive(n, image) {
    this.drives[n & 3] = image;
  }

  ejectDrive(n) {
    this.drives[n & 3] = null;
  }

  anyDiskMounted() {
    return this.drives.some((d) => d !== null);
  }

  currentDisk() {
    return this.drives[this.selected];
  }

  /** Port 0xF4 write */
  selectDrive(value) {
    if (value & 0x01) this.selected = 0;
    else if (value & 0x02) this.selected = 1;
    else if (value & 0x04) this.selected = 2;
    else if (value & 0x08) this.selected = 3;
    this.side = value & 0x10 ? 1 : 0;
  }

  /** Advance emulated time; completes in-flight commands. */
  tick(cycles) {
    this.indexClock = (this.indexClock + cycles) % INDEX_PERIOD;
    if (this.pending) {
      this.pending.delay -= cycles;
      if (this.pending.delay <= 0) {
        const kind = this.pending.kind;
        this.pending = null;
        this._complete(kind);
      }
    }
  }

  _complete(kind) {
    const disk = this.currentDisk();
    switch (kind) {
      case "type1":
        this.status = this._type1Status();
        this._finish();
        break;

      case "read-sector": {
        const read = disk
          ? disk.readSectorEx(this.physicalTrack[this.selected], this.side, this.sectorReg)
          : null;
        if (!read) {
          this.status = ST_RNF;
          this._finish();
        } else {
          this.buffer = read.data;
          this.bufferPos = 0;
          this.writing = false;
          // The 179x knows the DAM before the first data byte, and DOSes
          // check bit 5 after completion — _finish only drops BUSY|DRQ,
          // so the record type survives until the next command.
          this.status = ST_BUSY | ST_DRQ | (read.deleted ? ST_RECORD_TYPE : 0);
        }
        break;
      }

      case "write-sector": {
        if (!disk) {
          this.status = ST_RNF;
          this._finish();
        } else if (disk.writeProtected) {
          this.status = ST_WRITE_PROTECT;
          this._finish();
        } else {
          // Probe the sector exists before accepting data
          const probe = disk.readSector(this.physicalTrack[this.selected], this.side, this.sectorReg);
          if (!probe) {
            this.status = ST_RNF;
            this._finish();
          } else {
            this.buffer = new Uint8Array(probe.length);
            this.bufferPos = 0;
            this.writing = true;
            this.status = ST_BUSY | ST_DRQ;
          }
        }
        break;
      }

      case "read-address": {
        // 6 ID bytes: track, side, sector, size code, CRC1, CRC2
        const track = this.physicalTrack[this.selected];
        const firstSector = disk ? (disk.sectorBase ?? 0) : 0;
        this.buffer = new Uint8Array([track, this.side, firstSector, 0x01, 0, 0]);
        this.bufferPos = 0;
        this.writing = false;
        this.status = ST_BUSY | ST_DRQ;
        break;
      }

      default:
        this._finish();
    }
  }

  _finish() {
    // Completion drops BUSY and DRQ together (type I status is
    // recomputed live on the next read, so losing bit 1 there is fine)
    this.status &= ~(ST_BUSY | ST_DRQ);
    this.intrq = true;
    this.buffer = null;
    this.writing = false;
  }

  _type1Status() {
    const disk = this.currentDisk();
    let s = ST_HEAD_LOADED;
    if (!disk) s |= ST_NOT_READY;
    if (this.physicalTrack[this.selected] === 0) s |= ST_TRACK0;
    if (disk && disk.writeProtected) s |= ST_WRITE_PROTECT;
    if (this.indexClock < INDEX_WIDTH) s |= ST_INDEX;
    return s;
  }

  /** Port 0xF0 read */
  readStatus() {
    this.intrq = false; // reading status clears INTRQ
    if (this.commandType === 1) {
      // Recompute live bits (index pulse, track 0)
      if (!(this.status & ST_BUSY)) {
        this.status = this._type1Status();
      }
      return this.status;
    }
    return this.status;
  }

  /** Port 0xF0 write */
  writeCommand(value) {
    this.intrq = false;
    const high = value >> 4;

    // Type IV: force interrupt
    if (high === 0x0d) {
      this.pending = null;
      this.buffer = null;
      this.status &= ~ST_BUSY;
      this.commandType = 1;
      this.status = this._type1Status();
      if (value & 0x08) this.intrq = true;
      return;
    }

    if (this.status & ST_BUSY && this.pending) {
      return; // busy: ignore new commands (except force interrupt above)
    }

    if (high <= 0x07) {
      // Type I: restore/seek/step family
      this.commandType = 1;
      const drive = this.selected;
      if (high === 0x00) {
        this.physicalTrack[drive] = 0;
        this.trackReg = 0;
      } else if (high === 0x01) {
        this.physicalTrack[drive] = this.dataReg;
        this.trackReg = this.dataReg;
      } else {
        // STEP/STEP-IN/STEP-OUT with optional track update (bit 4)
        const dir = high >= 0x06 ? -1 : high >= 0x04 ? 1 : this._lastStepDir || 1;
        if (high >= 0x04) this._lastStepDir = dir;
        this.physicalTrack[drive] = Math.max(0, this.physicalTrack[drive] + dir);
        if (value & 0x10) this.trackReg = this.physicalTrack[drive];
      }
      this.status = ST_BUSY;
      this.pending = { kind: "type1", delay: COMPLETION_DELAY };
      return;
    }

    if (high === 0x08 || high === 0x09) {
      // READ SECTOR (multi-sector treated as single)
      this.commandType = 2;
      this.status = ST_BUSY;
      this.pending = { kind: "read-sector", delay: COMPLETION_DELAY };
      return;
    }
    if (high === 0x0a || high === 0x0b) {
      // WRITE SECTOR (bit 0 selects the DAM: 1 = deleted/0xF8)
      this.commandType = 2;
      this.writeDeleted = (value & 0x01) !== 0;
      this.status = ST_BUSY;
      this.pending = { kind: "write-sector", delay: COMPLETION_DELAY };
      return;
    }
    if (high === 0x0c) {
      // READ ADDRESS
      this.commandType = 3;
      this.status = ST_BUSY;
      this.pending = { kind: "read-address", delay: COMPLETION_DELAY };
      return;
    }
    // READ TRACK (0xE) / WRITE TRACK (0xF): accept and complete "ok".
    // True formatting is a future extension; DOS format won't work yet.
    this.commandType = 3;
    this.status = ST_BUSY;
    this.pending = { kind: "noop", delay: COMPLETION_DELAY };
  }

  readTrackReg() {
    return this.trackReg;
  }
  writeTrackReg(v) {
    this.trackReg = v & 0xff;
  }
  readSectorReg() {
    return this.sectorReg;
  }
  writeSectorReg(v) {
    this.sectorReg = v & 0xff;
  }

  /** Port 0xF3 read: pump read buffer */
  readData() {
    if (this.buffer && !this.writing) {
      this.dataReg = this.buffer[this.bufferPos++];
      if (this.bufferPos >= this.buffer.length) {
        this._finish();
      }
    }
    return this.dataReg;
  }

  /** Port 0xF3 write: pump write buffer */
  writeData(v) {
    this.dataReg = v & 0xff;
    if (this.buffer && this.writing) {
      this.buffer[this.bufferPos++] = this.dataReg;
      if (this.bufferPos >= this.buffer.length) {
        const disk = this.currentDisk();
        disk.writeSector(
          this.physicalTrack[this.selected],
          this.side,
          this.sectorReg,
          this.buffer,
          { deleted: this.writeDeleted }
        );
        this._finish();
      }
    }
  }
}
