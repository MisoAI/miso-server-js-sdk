import EasyTransform from '../stream/easy-transform.js';

export default class DowngradeChannel extends EasyTransform {

  constructor({ objectMode, ...options } = {}) {
    super({
      ...options,
      writableObjectMode: true,
      readableObjectMode: objectMode,
    });
    this._objectMode = objectMode;
  }

  async _runTransform({ type, payload }) {
    switch (type) {
      case 'data':
        payload !== undefined && this._pushBuffer(this._format(payload));
        break;
    }
  }

  _format(payload) {
    // TODO: review this
    return (this._objectMode || typeof payload === 'string') ? payload : JSON.stringify(payload);
  }

}
