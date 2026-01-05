import { Transform } from 'stream';

export default class EasyTransform extends Transform {

  constructor({ transform, flush, ...options } = {}) {
    super(options);
    if (transform) {
      if (typeof transform !== 'function') {
        throw new Error(`transform must be a function`);
      }
      this._runTransform = transform.bind(this);
    }
    if (flush) {
      if (typeof flush !== 'function') {
        throw new Error(`flush must be a function`);
      }
      this._runFlush = flush.bind(this);
    }
    this._buffer = [];
    this._callback = undefined;
  }

  // customization //
  async _runTransform(chunk, encoding) {
    throw new Error(`Unimplemented.`);
  }

  async _runFlush() {}

  // stream internal //
  async _transform(chunk, encoding, next) {
    await this._runTransform(chunk, encoding);
    this._callback = next;
    this._flushBuffer();
  }

  async _flush(done) {
    await this._runFlush();
    this._callback = done;
    this._flushBuffer();
  }

  _read() {
    this._flushBuffer();
  }

  _pushBuffer(chunk, encoding) {
    this._buffer.push([chunk, encoding]);
    this._flushBuffer();
  }

  _flushBuffer() {
    const buffer = this._buffer;
    while (buffer.length > 0) {
      if (!this.push(...buffer.shift())) {
        break;
      }
    }
    if (this._callback) {
      const callback = this._callback;
      this._callback = undefined;
      callback();
    }
  }

}
