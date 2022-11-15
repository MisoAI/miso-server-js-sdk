import { Transform } from 'stream';
import { v4 as uuid } from 'uuid';
import { trimObj } from '../object.js';
import { delay } from '../async.js';
import * as log from '../log/index.js';
import State from './buffered-write-state.js';

const MIN_HREATBEAT_INTERVAL = 100;

export default class BufferedWriteStream extends Transform {

  static DEFAULTS = {
    // merge everything except for payload
    output: (message, { payload: _, ...args } = {}) => ({ ...message, ...args }),
  };

  constructor({
    objectMode,
    sink,
    buffer,
    output,
    heartbeatInterval,
    ...options
  } = {}) {
    super({
      readableObjectMode: true,
      writableObjectMode: objectMode,
    });
    Object.defineProperty(this, 'id', { value: uuid() });

    this._sink = sink;
    this._buffer = buffer;

    this._fns = {
      output,
    };

    this._options = this._normalizeOptions({
      objectMode,
      heartbeatInterval,
      ...options,
    });

    this._state = new State();

    // log functions
    for (const level of log.LEVELS) {
      this[`_${level}`] = this._log.bind(this, level);
    }
  }

  _normalizeOptions({
    objectMode,
    heartbeatInterval = false,
    ...options
  } = {}) {
    if (heartbeatInterval !== false && (isNaN(heartbeatInterval) || heartbeatInterval < MIN_HREATBEAT_INTERVAL)) {
      throw new Error(`Heartbeat interval must be a number in milliseconds at least ${MIN_HREATBEAT_INTERVAL}: ${heartbeatInterval}`);
    }
    return trimObj({
      objectMode: !!objectMode,
      heartbeatInterval,
      ...options,
    });
  }

  _construct(done) {
    const heartbeatInterval = this._options.heartbeatInterval;
    if (heartbeatInterval) {
      this._heartbeatIntervalId = setInterval(this._heartbeat.bind(this), heartbeatInterval);
    }

    const { config } = this;
    this._info('construct', { config });

    done();
  }

  async _transform(record, _) {
    this._pushStartEventIfNecessary();
    this._dispatchAll(this._buffer.push(record));
    await this._pauseIfNecessary();
  }

  async _flush(done) {
    this._dispatchAll(this._buffer.flush());
    await this._state.finish();
    this._buffer.destroy();

    // stop heartbeat before end event
    if (this._heartbeatIntervalId) {
      clearInterval(this._heartbeatIntervalId);
      delete this._heartbeatIntervalId;
    }

    // in case of empty stream, we still want a start event
    this._pushStartEventIfNecessary();

    const { successful, failed } = this._state;
    this._info('end', { successful, failed });

    done();
  }

  get state() {
    return this._state.snapshot();
  }

  get config() {
    return Object.freeze({
      id: this.id.substring(0, 8),
      sink: this._sink.config,
      buffer: this._buffer.config,
      ...this._options,
    });
  }

  // can be overwritten //
  _output(message, args) {
    return (this._fns.output || BufferedWriteStream.DEFAULTS.output)(message, args);
  }

  // helper //
  _heartbeat() {
    this._log(log.DEBUG, 'heartbeat');
  }

  _log(level, event, args) {
    const message = trimObj({
      level,
      event,
      timestamp: Date.now(),
      state: this.state,
    });
    this.push(this._output(message, args));
  }

  _pushStartEventIfNecessary() {
    if (this._state.next.request === 0 && this._buffer.records === 0) {
      this._info('start');
    }
  }

  async _pauseIfNecessary() {
    const pauseTime = this._sink.blockedTime();
    if (pauseTime > 0) {
      const pausedAt = Date.now();
      this._state.pause(pausedAt, pauseTime);
      this._debug('pause', { pausedAt, pauseTime });
      await delay(pauseTime);
      const resumeAt = Date.now();
      this._state.resume(resumeAt);
      this._debug('resume', { resumeAt });
    } else if (this._state._pending.length > 15) {
      // TODO: figure out best strategy on this
      // release event loop for downstream
      await delay();
    }
  }

  _dispatchAll(dispatches) {
    for (const dispatch of dispatches) {
      this._dispatch(dispatch); // don't wait
    }
  }

  async _dispatch({ records, bytes, payload }) {
    const request = this._state.request({ records, bytes });
    this._debug('request', { request, payload });

    const response = await this._writeToSink({ request, payload });

    this._state.resolve(request, response);
    const failed = response.errors;
    (failed ? this._error : this._debug)('response', { request, response, payload });

    this._info('write', {
      result: failed ? 'failed' : 'successful',
      index: request.index,
      records: request.records,
      bytes: request.bytes,
      time: response.timestamp - request.timestamp,
    });
  }

  async _writeToSink({ request, payload }) {
    return this._sink.write(payload);
  }

}
