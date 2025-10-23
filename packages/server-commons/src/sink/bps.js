import { trimObj } from '../object.js';

export default class BpsSink {

  constructor(options) {
    this._options = this._normalizeOptions(options);
    this._stats = {
      started: { count: 0, records: 0, bytes: 0 },
      finished: { count: 0, records: 0, bytes: 0 },
    };
  }

  _normalizeOptions({
    writesPerSecond = 5,
    recordsPerSecord = 100000,
    bytesPerSecond = 100 * 1024 * 1024,
    ...options
  } = {}) {
    return {
      writesPerSecond,
      recordsPerSecord,
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

  async write(payload, { records, bytes } = {}) {
    const { started, finished } = this._stats;
    if (started.count === 0) {
      this._firstWriteAt = Date.now();
    }
    started.count++;
    started.records += records;
    started.bytes += bytes;

    let response;
    try {
      response = await this._write(payload, { records, bytes });
    } catch(error) {
      response = trimObj({ errors: true, cause: error.message });
    }
    finished.count++;
    finished.records += records;
    finished.bytes += bytes;

    return trimObj({
      ...response,
      timestamp: Date.now(),
    });
  }

  blockedTime() {
    const now = Date.now();
    const elapsed = now - this._firstWriteAt;
    const targetBps = this._targetBps(now);
    const targetRps = this._targetRps(now);
    const targetWps = this._targetWps(now);

    const { started } = this._stats;
    const shallElapsed = Math.max(started.records / targetRps, started.bytes / targetBps, started.count / targetWps) * 1000;

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

  _targetBps(timestamp) {
    return this._options.bytesPerSecond;
  }

  _targetRps(timestamp) {
    return this._options.recordsPerSecord;
  }

  _targetWps(timestamp) {
    return this._options.writesPerSecord;
  }

}
