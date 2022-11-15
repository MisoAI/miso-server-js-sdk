import { trimObj } from '../object.js';

export default class BpsSink {

  constructor(options) {
    this._options = this._normalizeOptions(options);
    this._stats = {
      started: { count: 0, bytes: 0 },
      finished: { count: 0, bytes: 0 },
    };
  }

  _normalizeOptions({
    bytesPerSecond = 4 * 1024 * 1024,
    ...options
  } = {}) {
    return {
      bytesPerSecond,
      ...options,
    };
  }

  get config() {
    return Object.freeze({
      ...this._options,
    });
  }
  
  get stats() {
    return Object.freeze({ ...this._stats });
  }

  async write(payload) {
    const stats = this._stats;
    if (stats.started.count === 0) {
      this._firstWriteAt = Date.now();
    }
    const bytes = this._sizeOf(payload);
    stats.started.count++;
    stats.started.bytes += bytes;

    let response;
    try {
      response = await this._write(payload, { bytes });
    } catch(error) {
      response = trimObj({ errors: true, cause: error.message });
    }
    stats.finished.count++;
    stats.finished.bytes += bytes;

    return trimObj({
      ...response,
      timestamp: Date.now(),
    });
  }

  blockedTime() {
    const now = Date.now();
    const elapsed = now - this._firstWriteAt;
    const targetBps = this._targetBps(now);
    const shallElapsed = this._stats.started.bytes / targetBps * 1000;

    const blockedTime = shallElapsed - elapsed;
    if (blockedTime <= 1000) {
      return 0;
    }
    // TODO: review this
    return Math.ceil(blockedTime);
  }

  async _write(payload) {
    throw new Error(`Unimplemented.`);
  }

  _sizeOf(payload) {
    throw new Error(`Unimplemented.`);
  }

  _targetBps(timestamp) {
    return this._options.bytesPerSecond;
  }

}
