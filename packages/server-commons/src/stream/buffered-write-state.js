import { trimObj } from '../object.js';
import Resolution from '../resolution.js';

const STATUS = Object.freeze({
  WAITING: 'waiting',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
});

export default class State {

  static get STATUS() {
    return STATUS;
  }

  constructor() {
    this._status = 'waiting';
    this._resolutions = new WeakMap();
    this._time = new Time(Date.now());

    this._next = Object.freeze({
      request: 0,
      record: 0,
    });
    this._pending = [];
    this._successful = {
      requests: 0,
      records: 0,
      bytes: 0,
    };
    this._failed = {
      requests: 0,
      records: 0,
      bytes: 0,
    };
  }

  // status //
  get status() {
    return this._status;
  }

  pause(pausedAt, pauseTime) {
    if (this._status === STATUS.PAUSED) {
      return;
    }
    this._time.pause(pausedAt, pauseTime);
    this._status = STATUS.PAUSED;
  }

  resume(resumeAt) {
    if (this._status !== STATUS.PAUSED) {
      return;
    }
    this._time.resume(resumeAt);
    this._status = this._next.request === 0 ? STATUS.WAITING : STATUS.RUNNING;
  }

  async finish() {
    await Promise.all(this._pending.map(r => this._resolutions.get(r).promise));
    this._status = STATUS.FINISHED;
  }

  // data stats //
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

  get time() {
    return this._time;
  }

  // speed management //
  bps(timestamp) {
    const elapsed = this._time.elapsed(timestamp || Date.now());
    return elapsed > 0 ? this.sent.bytes / elapsed * 1000 : NaN;
  }

  // operation //
  request({ records, bytes }) {
    const timestamp = Date.now();
    const { next } = this;
    if (next.request === 0) {
      this._time.setFirstWrite(timestamp);
    }
    const request = Object.freeze({
      index: next.request,
      recordOffset: next.record,
      records,
      bytes,
      timestamp,
    });
    this._resolutions.set(request, new Resolution());
    this._next = Object.freeze({
      request: next.request + 1,
      record: next.record + records,
    });
    this._pending.push(request);
    return request;
  }

  resolve(request, response) {
    this._pending = this._pending.filter(r => r.index !== request.index);

    const category = response.errors ? this._failed : this._successful;
    category.requests++;
    category.records += request.records;
    category.bytes += request.bytes;

    if (response.errors && response.recovered && response.recovered.records > 0) {
      this._failed.records -= response.recovered.records;
      this._failed.bytes -= response.recovered.bytes; // not so accurate, but close enough
      this._successful.requests++;
      this._successful.records += response.recovered.records;
      this._successful.bytes += response.recovered.bytes;
    }

    this._time.addWrite(response.timestamp - request.timestamp);

    this._resolutions.get(request).resolve();
  }

  // summary //
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
    });
  }

  snapshot(timestamp) {
    timestamp = timestamp || Date.now();
    const { status, next, pending, successful, failed, sent, completed } = this;
    return Object.freeze({
      status, next, pending, sent, successful, failed, completed,
      time: this._time.snapshot(timestamp),
      bps: this.bps(timestamp),
    });
  }

}

class Time {

  constructor(timestamp) {
    Object.defineProperty(this, 'constructedAt', { value: timestamp });
    this._firstWriteAt = undefined;
    this._write = 0;
    this._pausedAt = undefined;
    this._willResumeAt = undefined;
    this._paused = 0;
  }

  // operation //
  setFirstWrite(timestamp) {
    if (this._firstWriteAt !== undefined) {
      throw new Error(`First write time already set: ${this._firstWriteAt}`);
    }
    this._firstWriteAt = timestamp;
  }

  addWrite(duration) {
    this._write += duration;
  }

  pause(pausedAt, pauseTime) {
    if (this._firstWriteAt === undefined || this._pausedAt !== undefined) {
      throw new Error(`Cannot pause() before first write or when paused.`);
    }
    this._pausedAt = pausedAt;
    this._willResumeAt = pausedAt + pauseTime;
  }

  resume(resumeAt) {
    if (this._firstWriteAt === undefined || this._pausedAt === undefined) {
      throw new Error(`Cannot resume() before first write or when not paused.`);
    }
    this._paused += resumeAt - this._pausedAt;
    this._pausedAt = this._willResumeAt = undefined;
  }

  // stats //
  get firstWriteAt() {
    return this._firstWriteAt;
  }

  get pausedAt() {
    return this._pausedAt;
  }

  get willResumeAt() {
    return this._willResumeAt;
  }

  get write() {
    return this._write;
  }

  total(timestamp) {
    return timestamp - this.constructedAt;
  }

  waiting(timestamp) {
    return (this._firstWriteAt !== undefined ? this._firstWriteAt : timestamp) - this.constructedAt;
  }

  elapsed(timestamp) {
    return this._firstWriteAt === undefined ? 0 : timestamp - this._firstWriteAt;
  }

  paused(timestamp) {
    return this._paused + (this._pausedAt !== undefined ? timestamp - this._pausedAt : 0);
  }

  running(timestamp) {
    return this.elapsed(timestamp) - this.paused(timestamp);
  }

  snapshot(timestamp) {
    const { constructedAt, firstWriteAt, pausedAt, willResumeAt, write } = this;
    return Object.freeze(trimObj({
      currentTime: timestamp,
      constructedAt,
      firstWriteAt,
      pausedAt,
      willResumeAt,
      write,
      total: this.total(timestamp),
      waiting: this.waiting(timestamp),
      elapsed: this.elapsed(timestamp),
      paused: this.paused(timestamp),
      running: this.running(timestamp),
    }));
  }

}
