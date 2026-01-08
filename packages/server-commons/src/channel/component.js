import EasyTransform from '../stream/easy-transform.js';
import { trimObj } from '../object.js';

// TODO: camelCase to kebab-case on options keys
function exportOptions(options) {
  return trimObj({ ...options });
}

export class ChannelComponent {

  constructor(options = {}) {
    this._options = this._normalizeOptions(options);
  }

  _normalizeOptions({
    ...options
  }) {
    return trimObj({
      ...options,
    });
  }

  get options() {
    return exportOptions(this._options);
  }

}

// TODO: by mixin

export class ChannelBase extends EasyTransform {

  constructor({ name, ...options } = {}) {
    super({ ...options, objectMode: true });
    this._options = this._normalizeOptions(options);
    this._name = name || this.constructor.name;
  }

  _normalizeOptions({
    objectMode,
    writableObjectMode,
    readableObjectMode,
    ...options
  }) {
    return trimObj({
      ...options,
    });
  }

  get name() {
    return this._name;
  }

  get options() {
    return exportOptions(this._options);
  }

  get pulse() {
    return {};
  }

  get result() {
    return {};
  }

}
