import { Transform } from 'stream';
import { trimObj } from '@miso.ai/server-commons';

function getDefaultRecordsPerRequest(type) {
  return type === 'interactions' ? 1000 : 200;
}

const PAYLOAD_PREFIX = '{"data":[';
const PAYLOAD_SUFFIX = ']}';
const PAYLOAD_OVERHEAD_BYTES = (PAYLOAD_PREFIX.length + PAYLOAD_SUFFIX.length) * 2;

const requestPromises = new WeakMap();

export default class UploadStream extends Transform {

  constructor(client, type, {
    objectMode,
    async, 
    dryRun,
    recordsPerRequest,
    bytesPerRequest,
    bytesPerSecond,
  } = {}) {
    super({
      readableObjectMode: true,
      writableObjectMode: objectMode,
    });
    this._client = client;
    this._type = type;
    this._options = {
      objectMode: !!objectMode,
      async: !!async, 
      dryRun: !!dryRun,
      recordsPerRequest: recordsPerRequest || getDefaultRecordsPerRequest(type),
      bytesPerRequest: bytesPerRequest || 1024 * 1024,
      bytesPerSecond: bytesPerSecond || 5 * 1024 * 1024,
    };
    this._state = new State();
    this._resetBuffer();
  }

  _construct(done) {
    this.push({
      event: 'construct',
      timestamp: Date.now(),
      config: this.config,
    });
    done();
  }

  _transform(record, _, next) {
    this._pushStartEventIfNecessary();
    const { objectMode, bytesPerRequest } = this._options;
    const str = objectMode ? JSON.stringify(record) : record;
    const newSize = str.length * 2;

    if (this._buffer.records && this._buffer.bytes + newSize >= bytesPerRequest) {
      // flush previous records if this record is large enough to exceed BPR threshold
      this._dispatch();
    }
    if (this._buffer.records > 0) {
      this._buffer.content += ',';
    }
    this._buffer.content += str;
    this._buffer.bytes += newSize;
    this._buffer.records++;

    this._dispatchIfNecessary();

    const restTime = this._state.restTime(this._getBpsLimit());
    if (restTime > 0) {
      this.push({
        event: 'rest',
        timestamp: Date.now(),
        state: this.state,
        restTime,
      });
      setTimeout(next, restTime);
    } else {
      next();
    }
  }

  async _flush(done) {
    this._pushStartEventIfNecessary();
    this._dispatch();
    await Promise.all(this._state.pending.map(r => requestPromises.get(r)));
    this.push({
      event: 'end',
      timestamp: Date.now(),
      state: this.state,
    });
    done();
  }

  get state() {
    return this._state.export();
  }

  get config() {
    return Object.freeze({
      type: this._type,
      ...this._client.options,
      ...this._options,
    });
  }

  // helper //
  _pushStartEventIfNecessary() {
    if (this._state.next.request === 0 && this._buffer.records === 0) {
      this.push({
        event: 'start',
        timestamp: Date.now(),
        state: this.state,
      });
    }
  }

  _dispatchIfNecessary() {
    const { records, bytes } = this._buffer;
    const { recordsPerRequest, bytesPerRequest } = this._options;
    if (records > 0 && (records >= recordsPerRequest || bytes >= bytesPerRequest)) {
      this._dispatch();
    }
  }

  _dispatch() {
    const { records, bytes, content } = this._resetBuffer();
    if (records === 0) {
      return;
    }
    const request = this._state.createRequest(records, bytes);

    let requestResolve;
    requestPromises.set(request, new Promise(r => {
      requestResolve = r;
    }));

    this.push({
      event: 'request',
      timestamp: Date.now(),
      state: this.state,
      request,
    });

    this._state.open(request);

    const payload = content + PAYLOAD_SUFFIX;

    (async () => {
      let response;
      try {
        const { async, dryRun } = this._options;
        response = (await this._client.upload(this._type, payload, { async, dryRun })).data;
      } catch(error) {
        response = error.response ? error.response.data : trimObj({ errors: true, cause: error.message });
      }
      response.timestamp = Date.now();

      requestResolve();

      this._state.close(request, response);

      this.push(trimObj({
        event: 'response',
        timestamp: Date.now(),
        state: this.state,
        request,
        response,
        payload: response.errors ? payload : undefined,
      }));
    })();
  }

  _resetBuffer() {
    const buffer = { ...this._buffer };
    this._buffer = {
      records: 0,
      bytes: PAYLOAD_OVERHEAD_BYTES,
      content: PAYLOAD_PREFIX,
    };
    return buffer;
  }

  /**
   * Note that when API is effectively in async mode, apiBps will be overestimated, but there is no harm to respect it.
   */
  _getBpsLimit() {
    const { bytesPerSecond } = this._options;
    const { pending, apiBps, completed } = this.state;
    // respect API BPS only when
    // 1. has pending requests
    // 2. has enouch data points from completed requests
    return pending.length > 0 && completed.requests > 9 && !isNaN(apiBps) && apiBps < bytesPerSecond ? apiBps : bytesPerSecond;
  }

}

class State {

  constructor() {
    this._start = Date.now();
    this._next = Object.freeze({
      request: 0,
      record: 0,
    });
    this._pending = [];
    this._successful = {
      requests: 0,
      records: 0,
      bytes: 0,
      took: 0,
      latency: 0,
    };
    this._failed = {
      requests: 0,
      records: 0,
      bytes: 0,
      took: 0,
      latency: 0,
    };
  }

  get start() {
    return this._start;
  }

  get next() {
    return this._next;
  }

  get pending() {
    return Object.freeze(this._pending.slice());
  }

  get successful() {
    return Object.freeze({ ...this._successful });
  }

  get failed() {
    return Object.freeze({ ...this._failed });
  }

  elapsed(time) {
    return (time || Date.now()) - this.start;
  }

  createRequest(records, bytes) {
    const { next } = this;
    const request = Object.freeze({
      index: next.request,
      recordOffset: next.record,
      records,
      bytes,
      timestamp: Date.now(),
    });
    this._next = Object.freeze({
      request: next.request + 1,
      record: next.record + records,
    });
    return request;
  }

  get sent() {
    const { _pending, completed } = this;
    return Object.freeze(_pending.reduce((acc, request) => {
      acc.requests++;
      acc.records += request.records;
      acc.bytes += request.bytes;
      return acc;
    }, {
      requests: completed.requests,
      records: completed.records,
      bytes: completed.bytes,
    }));
  }

  get completed() {
    const { _successful, _failed } = this;
    return Object.freeze({
      requests: _successful.requests + _failed.requests,
      records: _successful.records + _failed.records,
      bytes: _successful.bytes + _failed.bytes,
      took: _successful.took + _failed.took,
      latency: _successful.latency + _failed.latency,
    });
  }

  sentBps(timestamp) {
    const { sent } = this;
    const elapsed = this.elapsed(timestamp);
    return elapsed > 0 ? sent.bytes / elapsed * 1000 : NaN;
  }

  get apiBps() {
    const { _successful, _failed } = this;
    const took = _successful.took + _failed.took;
    const bytes = _successful.bytes + _failed.bytes;
    return took > 0 ? bytes / took * 1000 : NaN;
  }

  restTime(bps) {
    const elapsed = this.elapsed();
    const { sent } = this;
    return Math.max(0, sent.bytes / bps * 1000 - elapsed) * 1.05;
  }

  export(timestamp) {
    const { next, pending, successful, failed, sent, completed, apiBps } = this;
    timestamp = timestamp || Date.now();
    return Object.freeze({
      next, pending, sent, successful, failed, sent, completed,
      elapsed: this.elapsed(timestamp),
      apiBps,
      sentBps: this.sentBps(timestamp),
    });
  }

  open(request) {
    this._pending.push(request);
  }

  close(request, response) {
    this._pending = this._pending.filter(r => r.index !== request.index);
    const category = response.errors ? this._failed : this._successful;
    category.requests++;
    category.records += request.records;
    category.bytes += request.bytes;
    category.took += response.took;
    category.latency += response.timestamp - request.timestamp - response.took;
  }

}