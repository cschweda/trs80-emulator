/**
 * TRS-80 Model III Cassette Interface
 */

export class CassetteSystem {
  constructor() {
    this.motorOn = false;
    this.playing = false;
    this.recording = false;

    this.tapeData = null;
    this.tapePosition = 0;
    this.tapeLength = 0;

    this.BUFFER_ADDRESS = 0x4300;
    this.BUFFER_SIZE = 256;

    this.onLoadComplete = null;
    this.onSaveComplete = null;
  }

  loadTape(programData) {
    if (!programData || programData.length === 0) {
      return false;
    }

    this.tapeData =
      programData instanceof Uint8Array
        ? programData
        : new Uint8Array(programData);

    this.tapePosition = 0;
    this.tapeLength = this.tapeData.length;

    console.log(`Cassette loaded: ${this.tapeLength} bytes`);
    return true;
  }

  simulateCLoad(memory, targetAddress = 0x4200) {
    if (!this.tapeData) {
      console.error("No tape loaded");
      return false;
    }

    for (let i = 0; i < this.tapeLength; i++) {
      memory.writeByte(targetAddress + i, this.tapeData[i]);
    }

    console.log(
      `CLOAD: ${this.tapeLength} bytes at 0x${targetAddress.toString(16)}`
    );

    if (this.onLoadComplete) {
      this.onLoadComplete(targetAddress, this.tapeLength);
    }

    return targetAddress;
  }

  simulateCSave(memory, startAddress, length) {
    this.tapeData = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
      this.tapeData[i] = memory.readByte(startAddress + i);
    }

    this.tapePosition = 0;
    this.tapeLength = length;

    console.log(`CSAVE: ${length} bytes from 0x${startAddress.toString(16)}`);

    if (this.onSaveComplete) {
      this.onSaveComplete(this.tapeData);
    }

    return this.tapeData;
  }

  getStatus() {
    let status = 0x00;

    if (this.motorOn) status |= 0x01;
    if (this.playing) status |= 0x02;
    if (this.recording) status |= 0x04;
    if (this.tapeData && this.tapePosition < this.tapeLength) {
      status |= 0x08;
    }

    return status;
  }

  control(value) {
    this.motorOn = (value & 0x01) !== 0;

    if (this.motorOn) {
      this.playing = (value & 0x02) !== 0;
      this.recording = (value & 0x04) !== 0;
    } else {
      this.playing = false;
      this.recording = false;
    }
  }

  readByte() {
    if (!this.tapeData || this.tapePosition >= this.tapeLength) {
      return 0x00;
    }
    return this.tapeData[this.tapePosition++];
  }

  rewind() {
    this.tapePosition = 0;
  }

  eject() {
    this.tapeData = null;
    this.tapePosition = 0;
    this.tapeLength = 0;
    this.motorOn = false;
    this.playing = false;
    this.recording = false;
  }
}

