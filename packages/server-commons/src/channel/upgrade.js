import { trimObj } from '../object.js';
import EasyTransform from '../stream/easy-transform.js';
import { ChannelOutput, createStartEvent, createEndEvent } from './events.js';

export default class UpgradeChannel extends EasyTransform {

  constructor({ name = 'upgrade', config, result, upgrade, objectMode, ...options } = {}) {
    super({
      ...options,
      writableObjectMode: objectMode,
      readableObjectMode: true,
    });
    if (upgrade) {
      if (typeof upgrade !== 'function') {
        throw new Error('Upgrade must be a function');
      }
      this._upgrade = upgrade.bind(this);
    }
    if (config) {
      if (typeof config !== 'function') {
        throw new Error('Start must be a function');
      }
      this._config = config.bind(this);
    }
    if (result) {
      if (typeof result !== 'function') {
        throw new Error('End must be a function');
      }
      this._result = result.bind(this);
    }
    this._options = options;
    this._objectMode = objectMode;
    this._name = name;

    this._started = false;
    this.out = new ChannelOutput(this);
  }

  get name() {
    return this._name;
  }

  get config() {
    return this._config();
  }

  get result() {
    return this._result();
  }

  _config() {
    return {};
  }

  _result() {
    return {};
  }

  async _parse(payload, encoding) {
    if (this._objectMode) {
      return payload;
    }
    if (Buffer.isBuffer(payload)) {
      payload = payload.toString();
    }
    if (typeof payload === 'string') {
      payload = JSON.parse(payload.trim());
    }
    return payload;
  }

  async _upgrade(payload) {
    const form = this._options.form;
    return trimObj({
      form,
      payload,
    });
  }

  _createStartEvent() {
    return createStartEvent(this);
  }

  _createEndEvent() {
    return createEndEvent(this);
  }

  async _runTransform(payload, encoding) {
    // first read -> write start event
    if (!this._started) {
      this._started = true;
      this.out.write(this._createStartEvent());
    }
    payload = await this._parse(payload, encoding);
    this.out.write({
      ...(await this._upgrade(payload)),
      type: 'data',
    });
  }

  async _runFlush() {
    // write end event
    this.out.write(this._createEndEvent());
  }

}
