import Denque from 'denque';
import { Resolution } from './resolution.js';

export default class RateLimitingQueue {

  constructor({
    actionsPerSecond,
  } = {}) {
    if (actionsPerSecond !== undefined && (isNaN(actionsPerSecond) || actionsPerSecond <= 0)) {
      throw new Error(`Invalid value for actionsPerSecond: ${actionsPerSecond}`);
    }
    this._options = {
      actionsPerSecond,
    };
    this._interval = actionsPerSecond ? 1000 / actionsPerSecond : 0;
    this._queue = new Denque();
    this._running = this._busy = false;
  }

  push(fn) {
    const res = new Resolution();
    this._queue.push([fn, res]);
    this.start();
    return res.promise;
  }

  get running() {
    return this._running;
  }

  get busy() {
    return this._busy;
  }

  start() {
    this._running = true;
    if (!this._busy) {
      this._next();
    }
  }

  pause() {
    this._running = false;
  }

  _next() {
    const queue = this._queue;
    if (queue.isEmpty()) {
      this._running = false;
    }
    if (!this._running || this._busy) {
      return;
    }
    this._busy = true;
    const [fn, res] = queue.shift();
    this._exec(fn, res);

    setTimeout(() => {
      this._busy = false;
      this._next();
    }, this._interval);
  }

  async _exec(fn, res) {
    try {
      res.resolve(await fn());
    } catch(error) {
      res.reject(error);
    }
  }

}