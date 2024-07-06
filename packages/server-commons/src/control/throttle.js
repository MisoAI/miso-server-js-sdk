import TaskControl from './base.js';

export default class ThrottledTaskControl extends TaskControl {

  constructor({
    interval,
  }) {
    super();
    if (typeof interval !== 'number' || interval <= 0) {
      throw new Error(`interval must be a positive number: ${interval}`);
    }
    this._interval = interval;
  }

  get interval() {
    return this._interval;
  }

  open(id, data) {
    this._setReady(false);
    this._timeoutId && clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(() => {
      this._setReady(true);
      this._timeoutId = undefined;
    }, this._interval);
  }

}
