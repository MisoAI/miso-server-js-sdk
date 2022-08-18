export default class TaskQueue {

  constructor() {
    this._index = 0;
    this._finished = -1;
    this._promises = {};
  }

  request() {
    return this._index++;
  }

  async push(index, fn) {
    if (typeof index === 'function') {
      fn = index;
      index = this.request();
    }
    if (index > this._finished) {
      await this._waitFor(index - 1);
    }
    try {
      const value = await fn();
      this._resolve(index, value);
    } catch (error) {
      this._reject(index, error);
    }
  }

  _resolve(index, value) {
    const promises = this._promises;
    if (promises[index]) {
      promises[index].resolve(value);
      delete promises[index];
    }
    this._finished = index;
  }

  _reject(index, error) {
    const promises = this._promises;
    if (promises[index]) {
      promises[index].reject(error);
      delete promises[index];
    }
    this._finished = index;
  }

  _waitFor(index) {
    if (this._finished >= index) {
      return;
    }
    const promises = this._promises;
    if (promises[index]) {
      throw new Error();
    }
    return new Promise((resolve, reject) => {
      promises[index] = { resolve, reject };
    });
  }

}