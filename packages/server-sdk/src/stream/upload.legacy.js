import { Transform } from 'stream';
import { trimObj, log } from '@miso.ai/server-commons';
import version from '../version.js';

function getDefaultRecordsPerRequest(type) {
  switch (type) {
    case 'interactions':
      return 1000;
    default:
      return 200;
  }
}

function normalizeParams(params = []) {
  return params.reduce((acc, param) => {
    const [key, value = '1'] = param.split('=');
    acc[key] = value;
    return acc;
  }, {});
}

const PAYLOAD_PREFIX = '{"data":[';
const PAYLOAD_SUFFIX = ']}';
const PAYLOAD_OVERHEAD_BYTES = (PAYLOAD_PREFIX.length + PAYLOAD_SUFFIX.length) * 2;

const MIN_HREATBEAT = 100;

const requestPromises = new WeakMap();

export default class LegacyUploadStream extends Transform {

  constructor(client, type, {
    name,
    objectMode,
    async, 
    dryRun,
    params,
    heartbeat,
    recordsPerRequest,
    bytesPerRequest,
    bytesPerSecond,
    experimentId,
  } = {}) {
    super({
      readableObjectMode: true,
      writableObjectMode: objectMode,
    });
    this._client = client;
    this._type = type;
    this._options = {
      name,
      objectMode: !!objectMode,
      async: !!async, 
      dryRun: !!dryRun,
      params: normalizeParams(params),
      heartbeat,
      recordsPerRequest: recordsPerRequest || getDefaultRecordsPerRequest(type),
      bytesPerRequest: bytesPerRequest || 1024 * 1024,
      bytesPerSecond: bytesPerSecond || 4 * 1024 * 1024,
      experimentId,
    };
    if (heartbeat !== undefined && (typeof heartbeat !== 'number') || heartbeat < MIN_HREATBEAT) {
      throw new Error(`Heartbeat must be a number at least ${MIN_HREATBEAT}: ${heartbeat}`);
    }
    this._singleRecordPerRequest = false;

    switch (type) {
      case 'experiment-events':
        if (!experimentId) {
          throw new Error(`Experiment id is required for experiment APIs`);
        }
        this._singleRecordPerRequest = true;
    }

    this._state = new State();
    this._resetBuffer();
    // log functions
    for (const level of log.LEVELS) {
      this[`_${level}`] = this._log.bind(this, level);
    }
  }

  _construct(done) {
    const { config } = this;
    this._info('construct', { config });
    const heartbeat = this._options.heartbeat;
    if (heartbeat) {
      this._heartbeatIntervalId = setInterval(this._heartbeat.bind(this), heartbeat);
    }
    done();
  }

  _transform(record, _, next) {
    this._pushStartEventIfNecessary();
    const { objectMode, bytesPerRequest } = this._options;
    const str = objectMode ? JSON.stringify(record) : record;
    const newSize = str.length * 2;

    if (this._singleRecordPerRequest) {
      this._buffer.content = str;
      this._buffer.bytes = newSize;
      this._buffer.records = 1;
      this._dispatch();

    } else {
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
    }

    const restTime = this._state.restTime(this._getBpsLimit());
    if (restTime > 0) {
      this._debug('rest', { restTime });
      setTimeout(next, restTime);
    } else if (this._state._pending.length > 15) {
      // TODO: figure out best strategy on this
      // release event loop for downstream
      setTimeout(next);
    } else {
      next();
    }
  }

  _log(level, event, args = {}) {
    this.push(trimObj({
      name: this._options.name,
      level,
      event,
      timestamp: Date.now(),
      ...args,
      state: this.state,
    }));
  }

  _heartbeat() {
    this._log(log.DEBUG, 'heartbeat');
  }

  async _flush(done) {
    this._pushStartEventIfNecessary();
    this._dispatch();
    await Promise.all(this._state.pending.map(r => requestPromises.get(r)));
    const { successful, failed } = this.state;

    if (this._heartbeatIntervalId) {
      clearInterval(this._heartbeatIntervalId);
      delete this._heartbeatIntervalId;
    }

    this._info('end', { successful, failed });
    done();
  }

  get state() {
    return this._state.export();
  }

  get config() {
    return Object.freeze({
      version,
      type: this._type,
      ...this._client.options,
      ...this._options,
    });
  }

  // helper //
  _pushStartEventIfNecessary() {
    if (this._state.next.request === 0 && this._buffer.records === 0) {
      this._info('start');
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
    const singleRecord = this._singleRecordPerRequest;
    const { records, bytes, content } = this._resetBuffer();
    if (records === 0) {
      return;
    }
    const request = this._state.createRequest(records, bytes);

    let requestResolve;
    requestPromises.set(request, new Promise(r => {
      requestResolve = r;
    }));

    this._debug('request', { request });

    this._state.open(request);

    const payload = singleRecord ? content : content + PAYLOAD_SUFFIX;

    (async () => {
      let response;
      try {
        response = await this._upload(payload);
      } catch(error) {
        response = !error.response ? trimObj({ errors: true, cause: error.message }) :
          typeof error.response.data !== 'object' ? trimObj({ errors: true, cause: error.response.data }) :
          error.response.data;
      }
      response.timestamp = Date.now();
      response.took = response.took || 0; // TODO: ad-hoc

      requestResolve();
      this._state.close(request, response);

      const failed = response.errors;

      (failed ? this._error : this._debug)('response', { request, response, payload: failed ? JSON.parse(payload) : undefined });
      this._info('upload', {
        result: failed ? 'failed' : 'successful',
        index: request.index,
        records: request.records,
        bytes: request.bytes,
        took: response.took,
        latency: response.timestamp - request.timestamp - response.took
      });
    })();
  }

  async _upload(payload) {
    switch (this._type) {
      case 'experiment-events':
        const { experimentId } = this._options;
        return (await this._client.uploadExperimentEvent(experimentId, payload)).data;
      default:
        const { async, dryRun, params } = this._options;
        const response = await this._client.upload(this._type, payload, { async, dryRun, params });
        return response.data;
    }
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
    // TODO: threshold to switch to real API BPS should be based on bytes, not requests
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
      next, pending, sent, successful, failed, completed,
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