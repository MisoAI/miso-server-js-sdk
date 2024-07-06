import TaskControl from './base.js';

export default class WaterMarkTaskControl extends TaskControl{

  constructor({
    highWaterMark,
  }) {
    super();
    if (!Number.isInteger(highWaterMark) || highWaterMark <= 0) {
      throw new Error('highWaterMark must be a positive integer');
    }
    this._highWaterMark = highWaterMark;
    this._waterLevel = 0;
  }

  get waterLevel() {
    return this._waterLevel;
  }

  open(id, data) {
    this._waterLevel++;
    this._syncReady();
  }

  close(id) {
    this._waterLevel--;
    this._syncReady();
  }

  _syncReady() {
    this._setReady(this._waterLevel < this._highWaterMark);
  }

}
