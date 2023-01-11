import ApiSink from './api-sink.js';
import { upload } from '../api/helpers.js';

class UploadSink extends ApiSink {

  constructor(client, options) {
    super(client, options);
  }

  _normalizeOptions({
    async,
    dryRun,
    ...options
  } = {}) {
    if (!options.type) {
      throw new Error(`Type is required.`);
    }
    return {
      ...super._normalizeOptions(options),
      async: !!async,
      dryRun: !!dryRun,
    };
  }

  async _execute(payload) {
    const { type, async, dryRun, params } = this._options;
    const { data } = await upload(this._client, type, payload, { async, dryRun, params });
    return data;
  }

}

class DataSetUploadSink extends UploadSink {

  constructor(client, options) {
    super(client, options);
    this._stats.api = { count: 0, bytes: 0, took: 0 };
  }

  _normalizeOptions({
    apiBpsRate,
    apiBpsSampleThreshold = 1024 * 1024,
    ...options
  } = {}) {
    return {
      ...super._normalizeOptions(options),
      apiBpsRate: this._normalizeApiBpsRate(apiBpsRate, options),
      apiBpsSampleThreshold,
    };
  }

  _normalizeApiBpsRate(apiBpsRate, options) {
    if (options.type === 'interactions' || options.async) {
      // in async mode, apiBps is meaningless
      return false;
    }
    if (apiBpsRate === undefined || apiBpsRate === null) {
      // default to 1 if absent
      return 1;
    }
    if (apiBpsRate === false || (!isNaN(apiBpsRate) && apiBpsRate > 0)) {
      // legal values
      return apiBpsRate;
    }
    throw new Error(`Illegal apiBpsRate value: ${apiBpsRate}`);
  }

  _targetBps() {
    const { bytesPerSecond: configuredBps, apiBpsRate, apiBpsSampleThreshold } = this._options;
    if (apiBpsRate && this._stats.api.bytes < apiBpsSampleThreshold) {
      // use configured BPS until we have enough data from API response
      return configuredBps;
    }
    const apiBps = this._serviceStats.bps;
    return !isNaN(apiBps) ? Math.max(apiBps * apiBpsRate, configuredBps) : configuredBps;
  }

}

class ExperimentEventUploadSink extends UploadSink {

  constructor(client, options) {
    super(client, { ...options, type: 'experiment-events' });
  }

  async _execute(payload) {
    const { experimentId } = this._options;
    const response = await this._client.api.experiments.uploadEvent(experimentId, payload);
    return response.data;
  }

}

export default function create(client, type, options) {
  switch (type) {
    case 'users':
    case 'products':
    case 'interactions':
      return new DataSetUploadSink(client, { ...options, type });
    case 'experiment-events':
      return new ExperimentEventUploadSink(client, options);
    default:
      throw new Error(`Unrecognized type: ${type}`);
  }
}
