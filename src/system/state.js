/**
 * Save states: serialize a running TRS80System to a JSON-able object and
 * restore it into a system booted from the same ROM.
 *
 * The state carries everything the machine needs to resume mid-program:
 * CPU registers and interrupt state, RAM and video RAM, the I/O latches,
 * the FDC (including an in-flight command), the cassette tape, and the
 * full contents of every mounted disk (writes are in-memory, so the disk
 * bytes ARE the disk state). The ROM itself is NOT included — a state is
 * a snapshot of a machine, not a machine image.
 */

import { DiskImage } from "@peripherals/disk-image.js";

export const STATE_VERSION = 1;
export const STATE_MACHINE = "trs80-model3";

// Base64 helpers that work in both the browser and Node (vitest)
export function toBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function fromBase64(text) {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(text, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const CPU_SCALARS = [
  "IFF1",
  "IFF2",
  "interruptMode",
  "halted",
  "pendingEI",
  "cycles",
];
const IO_SCALARS = [
  "intLatch",
  "intMask",
  "nmiMask",
  "modeRegister",
  "cassetteOut",
];
const FDC_SCALARS = [
  "selected",
  "side",
  "trackReg",
  "sectorReg",
  "dataReg",
  "status",
  "intrq",
  "commandType",
  "bufferPos",
  "writing",
  "indexClock",
];

export function serializeState(system) {
  const cpu = system.cpu;
  const io = system.io;
  const fdc = io.fdc;

  const registers = {};
  for (const name of Object.keys(cpu.registers)) {
    registers[name] = cpu.registers[name];
  }

  const state = {
    version: STATE_VERSION,
    machine: STATE_MACHINE,
    cpu: { registers },
    memory: {
      ram: toBase64(system.memory.ram),
      videoRam: toBase64(system.memory.videoRam),
    },
    io: {},
    fdc: {
      physicalTrack: [...fdc.physicalTrack],
      pending: fdc.pending ? { ...fdc.pending } : null,
      buffer: fdc.buffer ? toBase64(fdc.buffer) : null,
    },
    cassette: {
      tape: io.cassette.tapeData ? toBase64(io.cassette.tapeData) : null,
      position: io.cassette.tapePosition,
      motorOn: io.cassette.motorOn,
    },
    disks: [],
    nextRtcAt: system.nextRtcAt,
  };
  for (const key of CPU_SCALARS) state.cpu[key] = cpu[key];
  for (const key of IO_SCALARS) state.io[key] = io[key];
  for (const key of FDC_SCALARS) state.fdc[key] = fdc[key];

  fdc.drives.forEach((disk, drive) => {
    if (!disk) return;
    state.disks.push({
      drive,
      name: disk.name,
      bytes: toBase64(disk.bytes),
      sectorBase: disk.sectorBase,
      writeProtected: disk.writeProtected,
    });
  });

  return state;
}

/**
 * Restore a serialized state into a system built from the same ROM.
 * Throws on version/machine mismatch rather than resuming garbage.
 */
export function restoreState(system, state) {
  if (!state || state.machine !== STATE_MACHINE) {
    throw new Error("Not a TRS-80 Model III save state");
  }
  if (state.version !== STATE_VERSION) {
    throw new Error(`Unsupported save-state version ${state.version}`);
  }

  const cpu = system.cpu;
  const io = system.io;
  const fdc = io.fdc;

  for (const [name, value] of Object.entries(state.cpu.registers)) {
    cpu.registers[name] = value;
  }
  for (const key of CPU_SCALARS) cpu[key] = state.cpu[key];
  for (const key of IO_SCALARS) io[key] = state.io[key];

  system.memory.ram.set(fromBase64(state.memory.ram));
  system.memory.videoRam.set(fromBase64(state.memory.videoRam));
  system.memory.videoDirty = true;

  for (const key of FDC_SCALARS) fdc[key] = state.fdc[key];
  fdc.physicalTrack = [...state.fdc.physicalTrack];
  fdc.pending = state.fdc.pending ? { ...state.fdc.pending } : null;
  fdc.buffer = state.fdc.buffer ? fromBase64(state.fdc.buffer) : null;

  io.cassette.eject();
  if (state.cassette.tape) {
    io.cassette.loadTape(fromBase64(state.cassette.tape));
    io.cassette.tapePosition = state.cassette.position;
  }
  io.cassette.motorOn = state.cassette.motorOn;

  fdc.drives = [null, null, null, null];
  for (const entry of state.disks) {
    const disk = new DiskImage(fromBase64(entry.bytes), entry.name);
    // Carry over learned/derived flags the constructor can't know
    disk.sectorBase = entry.sectorBase;
    disk.writeProtected = entry.writeProtected;
    fdc.drives[entry.drive & 3] = disk;
  }

  system.nextRtcAt = state.nextRtcAt;
  system._nmiWasPending = false;
  system.keyboard.reset(); // held keys don't survive a restore
  io.soundLog = [];

  return system;
}
