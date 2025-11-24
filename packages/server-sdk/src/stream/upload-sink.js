import ApiSink from './api-sink.js';
import { upload } from '../api/helpers.js';

class UploadSink extends ApiSink {

  constructor(client, options) {
    super(client, options);
  }

  _normalizeOptions({
    dryRun,
    ...options
  } = {}) {
    if (!options.type) {
      throw new Error(`Type is required.`);
    }
    return {
      ...super._normalizeOptions(options),
      dryRun: !!dryRun,
    };
  }

  async _execute(payload) {
    const { type, dryRun, params } = this._options;
    const { data } = await upload(this._client, type, payload, { recoverValidRecordsOn422: true, dryRun, params });
    return data;
  }

}

export default function create(client, type, options) {
  switch (type) {
    case 'users':
    case 'products':
    case 'interactions':
      return new UploadSink(client, { ...options, type });
    default:
      throw new Error(`Unrecognized type: ${type}`);
  }
}
