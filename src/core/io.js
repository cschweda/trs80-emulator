/**
 * TRS-80 Model III I/O System
 */

import { CassetteSystem } from "@peripherals/cassette.js";

export class IOSystem {
  constructor() {
    this.cassette = new CassetteSystem();
    this.keyboardBuffer = [];
    this.portHandlers = new Map();

    this.initializeModelIIIPorts();
  }

  initializeModelIIIPorts() {
    // Port 0xFF - Keyboard
    this.portHandlers.set(0xff, {
      read: () => this.readKeyboard(),
      write: () => {},
    });

    // Port 0xFE - Cassette
    this.portHandlers.set(0xfe, {
      read: () => this.cassette.getStatus(),
      write: (value) => this.cassette.control(value),
    });

    // Port 0xEC - System control
    this.portHandlers.set(0xec, {
      read: () => 0x00,
      write: (value) => this.handleSystemControl(value),
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

  readKeyboard() {
    return this.keyboardBuffer.length > 0 ? this.keyboardBuffer.shift() : 0x00;
  }

  addKey(keyCode) {
    if (this.keyboardBuffer.length < 256) {
      this.keyboardBuffer.push(keyCode & 0xff);
    }
  }

  handleSystemControl(value) {
    // System control implementation
  }

  clearKeyboardBuffer() {
    this.keyboardBuffer = [];
  }
}



