import { Duplex } from 'stream';
import { v4 as uuid } from 'uuid';
import { createTaskControl } from '../control/index.js';

export default class ParallelTransform extends Duplex {

  constructor({
    transform,
    controls,
    ...options
  } = {}) {
    super(options);
    if (transform !== undefined && typeof transform !== 'function') {
      throw new Error('transform must be a function');
    }
    this._transformFn = transform;
    this._control = createTaskControl(controls);

    this._next = undefined;
    this._pushPaused = false;
    this._outputBuffer;

    this._control.on('ready', (ready) => ready && this._callNext());
    this.on('drain', () => this._handleDrain());
  }

  async _transformFn(chunk, encoding) {
    throw new Error('transform function not defined');
  }

  _write(chunk, encoding, next) {
    const id = uuid();
    this._next = next;
    this._control.open(id, [chunk, encoding]);
    (async () => {
      try {
        const output = await this._transformFn(chunk, encoding);
        this._control.close(id);
        this._writeOutput(output);
      } catch (error) {
        this._error(error);
      }
    })();
    this._callNext();
  }

  _callNext() {
    if (this._next && this._control.ready) {
      const next = this._next;
      this._next = undefined;
      next();
    }
  }

  _writeOutput(output) {
    if (this._outputBuffer) {
      this._outputBuffer.push(output);
    } else if (!this.push(output)) {
      this._outputBuffer = [];
    }
  }

  _handleDrain() {
    if (!this._outputBuffer) {
      return;
    }
    const buffer = this._outputBuffer;
    for (let i = 0, len = buffer.length; i < len; i++) {
      if (!this.push(buffer[i])) {
        this._outputBuffer = buffer.slice(i + 1);
        break;
      }
    }
  }

  _read() {}

  _error(error) {
    this.emit('error', error);
  }

}
