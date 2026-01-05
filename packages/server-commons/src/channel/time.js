import { delay } from '../async.js';

export default class TimeTracker {

  constructor(timestamp = Date.now()) {
    Object.defineProperty(this, 'constructedAt', { value: timestamp });
    this._firstWriteAt = undefined;
    this._write = 0;
    this._pausedAt = undefined;
    this._willResumeAt = undefined;
    this._paused = 0;
  }

  // operation //
  setFirstWrite(timestamp = Date.now()) {
    if (this._firstWriteAt !== undefined) {
      throw new Error(`First write time already set: ${this._firstWriteAt}`);
    }
    this._firstWriteAt = timestamp;
  }

  addWrite(duration) {
    this._write += duration;
  }

  async pause(pauseTime, pausedAt = Date.now()) {
    if (pauseTime <= 0) {
      return;
    }
    if (this._firstWriteAt === undefined || this._pausedAt !== undefined) {
      throw new Error(`Cannot pause() before first write or when paused.`);
    }
    this._pausedAt = pausedAt;
    this._willResumeAt = pausedAt + pauseTime;
    await delay(pauseTime);
    this.paused && this.resume();
  }

  resume(resumeAt = Date.now()) {
    if (this._firstWriteAt === undefined || this._pausedAt === undefined) {
      throw new Error(`Cannot resume() before first write or when not paused.`);
    }
    this._paused += resumeAt - this._pausedAt;
    this._pausedAt = this._willResumeAt = undefined;
  }

  // stats //
  get paused() {
    return !!this._pausedAt;
  }

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

  snapshot(timestamp = Date.now()) {
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
