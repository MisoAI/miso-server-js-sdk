import { trimObj } from '../object.js';
import Resolution from '../resolution.js';
import { generateDefaultSinkResponse } from './events.js';

function clone(obj) {
  return Object.freeze(trimObj({ ...obj }));
}

export default class WriteChannelSink {

  constructor({ write, ...options } = {}) {
    this._options = this._normalizeOptions(options);
    if (write) {
      if (typeof write !== 'function') {
        throw new Error('write must be a function.');
      }
      this._write = write.bind(this);
    }
    this._state = {
      start: undefined,
      started: { index: -1, writes: 0, records: 0, bytes: 0 },
      finished: { index: -1, writes: 0, records: 0, bytes: 0, successful: 0, failed: 0 },
    };
  }

  _normalizeOptions({
    ...options
  }) {
    return trimObj({
      ...options,
    });
  }

  get options() {
    return { ...this._options };
  }

  get state() {
    const { start, started, finished } = this._state;
    return clone({
      start,
      started: clone(started),
      finished: clone(finished),
    });
  }

  async write(request) {
    if (this._finishedRes) {
      this._finishedRes.reject(new Error(`More data written after finished call`));
      this._finishedRes = undefined;
    }
    const { records, bytes, data } = request;
    const now = Date.now();
    const { started, finished } = this._state;
    if (started.writes === 0) {
      this._state.start = now;
    }
    started.index++;
    started.writes++;
    started.records += records;
    started.bytes += bytes;

    const { index } = started;
    let response;
    try {
      response = await this._write(request);
    } catch(error) {
      // TODO: add the error info into failed data events
      response = trimObj({
        writes: 1,
        successful: trimObj({ records: 0, data: [] }),
        failed: trimObj({ records, data }),
        error: error.message,
      });
    }

    // sanity check
    if (!response || !response.successful || !response.failed) {
      throw new Error(`Invalid response: ${JSON.stringify(response)}`);
    }
    if (response.successful.records + response.failed.records !== records) {
      throw new Error(`Invalid response: successful records (${response.successful.records}) + failed records (${response.failed.records}) !== records (${records})`);
    }

    // a _write call may use more than 1 write
    const writes = response.writes || 1;
    if (writes > 1) {
      started.writes += writes - 1; // patch the number
    }
    finished.index = index;
    finished.writes += writes;
    finished.records += records;
    finished.bytes += bytes;
    finished.successful += response.successful.records;
    finished.failed += response.failed.records;

    if (this._finishedRes && finished.writes === started.writes) {
      this._finishedRes.resolve();
      this._finishedRes = undefined;
    }

    return response;
  }

  async _write(event) {
    // default implementation: do nothing but assume all successful
    return generateDefaultSinkResponse(event);
  }

  get finished() {
    const { started, finished } = this._state;
    if (started.writes === finished.writes) {
      return Promise.resolve();
    }
    return (this._finishedRes || (this._finishedRes = new Resolution())).promise;
  }

  destroy() {
    if (this._finishedRes) {
      this._finishedRes.reject(new Error(`Stream is destroyed.`));
      this._finishedRes = undefined;
    }
  }

}
