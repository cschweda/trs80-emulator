/**
 * TRS-80 Model III I/O System
 *
 * Non-disk machine port map:
 *   0xE0-0xE3  read: interrupt latch, active-low (pending bit reads 0)
 *              write: interrupt mask (bit set = source enabled)
 *   0xEC-0xEF  read: acknowledge/clear the RTC interrupt
 *              write: mode register (bit 1 = cassette motor,
 *                     bit 2 = 32-column mode, bit 3 = alt charset)
 *   0xF0-0xF3  floppy controller — absent; reads float to 0xFF
 *   0xF4       drive select — absent
 *   0xFF       cassette port (write bits 0-1 = output level,
 *              read bit 7 = tape input)
 *
 * The RTC heartbeat interrupt fires at 30 Hz; its latch bit is RTC_IRQ_BIT.
 * The keyboard is memory-mapped at 0x3800-0x3BFF (see MemorySystem), not
 * an I/O port.
 */

import { CassetteSystem } from "@peripherals/cassette.js";
import { FDC1793 } from "@peripherals/fdc-wd1793.js";

export const RTC_IRQ_BIT = 0x04;

// NMI mask/status bits (port 0xE4)
export const NMI_INTRQ_BIT = 0x80;

// Mode register (port 0xEC write) bits
export const MODE_32COL_BIT = 0x04; // 32-character display mode

export class IOSystem {
  constructor() {
    this.cassette = new CassetteSystem();
    this.fdc = new FDC1793();
    this.keyboardBuffer = []; // legacy internal buffer (not a Model III port)
    this.portHandlers = new Map();

    // Interrupt latch (pending sources) and mask (enabled sources)
    this.intLatch = 0;
    this.intMask = 0;

    // NMI mask (port 0xE4 write): bit 7 = FDC INTRQ triggers NMI
    this.nmiMask = 0;

    // Mode register (port 0xEC write)
    this.modeRegister = 0;

    // Fired when a mode-register write changes the value (the display
    // reads bit 2, so the renderer must repaint even though video RAM
    // itself didn't change). Wired by TRS80System.
    this.onModeWrite = null;

    // Cassette output level (port 0xFF write, bits 0-1)
    this.cassetteOut = 0;

    // Cassette-out transitions for the sound driver: {t, level} stamped
    // in CPU T-states. getCycles is wired by TRS80System; the driver
    // drains the log every frame. Capped so an undrained log (sound off,
    // headless run) cannot grow without bound.
    this.getCycles = null;
    this.soundLog = [];
    this.SOUND_LOG_LIMIT = 100000;

    this.initializeModelIIIPorts();
  }

  initializeModelIIIPorts() {
    // 0xE0-0xE3: interrupt latch (read, active-low) / mask (write)
    for (let port = 0xe0; port <= 0xe3; port++) {
      this.portHandlers.set(port, {
        read: () => ~this.intLatch & 0xff,
        write: (value) => {
          this.intMask = value & 0xff;
        },
      });
    }

    // 0xEC-0xEF: RTC acknowledge (read) / mode register (write)
    for (let port = 0xec; port <= 0xef; port++) {
      this.portHandlers.set(port, {
        read: () => {
          this.intLatch &= ~RTC_IRQ_BIT;
          return 0xff;
        },
        write: (value) => {
          const changed = this.modeRegister !== (value & 0xff);
          this.modeRegister = value & 0xff;
          // Mode register bit 1 drives the cassette motor relay;
          // CassetteSystem.control expects the motor state in bit 0.
          this.cassette.control((value >> 1) & 0x01);
          if (changed && this.onModeWrite) {
            this.onModeWrite(this.modeRegister);
          }
        },
      });
    }

    // 0xE4-0xE7: disk NMI mask (write) / status (read, active-low).
    // With no controller "present" (no disk mounted) the port floats.
    for (let port = 0xe4; port <= 0xe7; port++) {
      this.portHandlers.set(port, {
        read: () => {
          if (!this.fdc.anyDiskMounted()) return 0xff;
          let value = 0xff;
          if (this.fdc.intrq) value &= ~NMI_INTRQ_BIT;
          return value;
        },
        write: (value) => {
          this.nmiMask = value & 0xff;
        },
      });
    }

    // 0xF0-0xF3: WD1793 FDC. The controller presents as absent (floating
    // bus) until a disk is mounted — that float is what sends the boot
    // ROM to cassette BASIC on a driveless machine.
    const fdcPresent = () => this.fdc.anyDiskMounted();
    this.portHandlers.set(0xf0, {
      read: () => (fdcPresent() ? this.fdc.readStatus() : 0xff),
      write: (v) => {
        if (fdcPresent()) this.fdc.writeCommand(v);
      },
    });
    this.portHandlers.set(0xf1, {
      read: () => (fdcPresent() ? this.fdc.readTrackReg() : 0xff),
      write: (v) => {
        if (fdcPresent()) this.fdc.writeTrackReg(v);
      },
    });
    this.portHandlers.set(0xf2, {
      read: () => (fdcPresent() ? this.fdc.readSectorReg() : 0xff),
      write: (v) => {
        if (fdcPresent()) this.fdc.writeSectorReg(v);
      },
    });
    this.portHandlers.set(0xf3, {
      read: () => (fdcPresent() ? this.fdc.readData() : 0xff),
      write: (v) => {
        if (fdcPresent()) this.fdc.writeData(v);
      },
    });

    // 0xF4: drive select / side / density latch
    this.portHandlers.set(0xf4, {
      read: () => 0xff,
      write: (v) => {
        if (fdcPresent()) this.fdc.selectDrive(v);
      },
    });

    // 0xFF: cassette data port. Level changes are the Model III's only
    // sound source, so they're logged for the audio driver.
    this.portHandlers.set(0xff, {
      read: () => 0x00, // bit 7 = tape input; no signal without a tape playing
      write: (value) => {
        const level = value & 0x03;
        if (level !== this.cassetteOut) {
          this.cassetteOut = level;
          if (this.getCycles && this.soundLog.length < this.SOUND_LOG_LIMIT) {
            this.soundLog.push({ t: this.getCycles(), level });
          }
        }
      },
    });
  }

  readPort(port) {
    port &= 0xff;
    const handler = this.portHandlers.get(port);
    return handler?.read ? handler.read() : 0xff;
  }

  writePort(port, value) {
    port &= 0xff;
    value &= 0xff;
    const handler = this.portHandlers.get(port);
    if (handler?.write) {
      handler.write(value);
    }
  }

  /** Raise the 30 Hz real-time clock interrupt line. */
  raiseRTC() {
    this.intLatch |= RTC_IRQ_BIT;
  }

  /** True when an enabled interrupt source is pending. */
  pendingInterrupt() {
    return (this.intLatch & this.intMask) !== 0;
  }

  /** True when the FDC's INTRQ should raise an NMI. */
  nmiPending() {
    return this.fdc.intrq && (this.nmiMask & NMI_INTRQ_BIT) !== 0;
  }

  /** Hand the accumulated cassette-out transitions to the sound driver. */
  drainSound() {
    if (this.soundLog.length === 0) return this.soundLog;
    const log = this.soundLog;
    this.soundLog = [];
    return log;
  }

  /** Clear interrupt state (system reset). Mounted disks stay mounted. */
  reset() {
    this.intLatch = 0;
    this.intMask = 0;
    this.nmiMask = 0;
    this.modeRegister = 0;
    this.cassetteOut = 0;
    this.soundLog = [];
    this.fdc.intrq = false;
    this.fdc.pending = null;
    this.fdc.buffer = null;
    this.fdc.status = 0;
    this.fdc.commandType = 1;
  }

  readKeyboard() {
    return this.keyboardBuffer.length > 0 ? this.keyboardBuffer.shift() : 0x00;
  }

  addKey(keyCode) {
    if (this.keyboardBuffer.length < 256) {
      this.keyboardBuffer.push(keyCode & 0xff);
    }
  }

  clearKeyboardBuffer() {
    this.keyboardBuffer = [];
  }
}
