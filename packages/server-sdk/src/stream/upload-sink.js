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

class ExperimentEventUploadSink extends UploadSink {

  constructor(client, options) {
    super(client, { ...options, type: 'experiment-events' });
  }

  async _execute(payload) {
    const { experimentId } = this._options;
    const { data } = await this._client.api.experiments.uploadEvent(experimentId, payload);
    return data;
  }

}

export default function create(client, type, options) {
  switch (type) {
    case 'users':
    case 'products':
    case 'interactions':
      return new UploadSink(client, { ...options, type });
    case 'experiment-events':
      return new ExperimentEventUploadSink(client, options);
    default:
      throw new Error(`Unrecognized type: ${type}`);
  }
}
