import ApiSink from './api-sink.js';
import { batchDelete } from '../api/helpers.js';

export default class DeleteSink extends ApiSink {

  constructor(client, options) {
    super(client, options);
  }

  _normalizeOptions({
    ...options
  } = {}) {
    if (!options.type) {
      throw new Error(`Type is required.`);
    }
    return {
      ...super._normalizeOptions(options),
    };
  }

  async _execute(payload) {
    const { type, params } = this._options;
    return batchDelete(this._client, type, payload, { params });
  }

}
