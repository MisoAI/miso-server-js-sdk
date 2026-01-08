import { trimObj } from '../object.js';
import { ChannelBase } from './component.js';
import { ChannelOutput, createStartEvent, createEndEvent } from './events.js';

export default class UpgradeChannel extends ChannelBase {

  constructor({ name = 'upgrade', upgrade, objectMode, ...options } = {}) {
    super({
      ...options,
      name,
      writableObjectMode: objectMode,
      readableObjectMode: true,
    });

    this._objectMode = objectMode;

    if (upgrade) {
      if (typeof upgrade !== 'function') {
        throw new Error('Upgrade must be a function');
      }
      this._upgrade = upgrade.bind(this);
    }

    this._started = false;
    this.out = new ChannelOutput(this);
  }

  async _parse(payload, encoding) {
    if (this._objectMode) {
      return payload;
    }
    if (Buffer.isBuffer(payload)) {
      payload = payload.toString();
    }
    if (typeof payload === 'string') {
      payload = payload.trim();
      if (!this._options.asId) {
        payload = JSON.parse(payload);
      }
    }
    return payload;
  }

  async _id(payload) {
    const id = this._options.idField;
    if (id) {
      return payload[id];
    }
    if (this._options.domain === 'miso') {
      // ad-hoc!
      return payload.product_id || payload.user_id;
    }
    return payload.id;
  }

  async _upgrade(payload) {
    const domain = this._options.domain;
    if (this._options.asId) {
      return trimObj({
        domain,
        id: `${payload}`.trim(),
      });
    } else {
      const id = await this._id(payload);
      return trimObj({
        domain,
        id,
        payload,
      });
    }
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
