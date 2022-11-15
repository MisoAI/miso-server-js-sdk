import { sink, trimObj } from '@miso.ai/server-commons';

class UploadSink extends sink.BpsSink {

  constructor(client, options) {
    super(options);
    this._client = client;
  }

  _normalizeOptions({
    async,
    dryRun,
    params,
    ...options
  } = {}) {
    return {
      ...super._normalizeOptions(options),
      ...trimObj({
        async: !!async,
        dryRun: !!dryRun,
        params: this._normalizeParams(params),
      }),
    };
  }

  _normalizeParams(params) {
    if (!params || params.length === 0) {
      return undefined;
    }
    return params.reduce((acc, param) => {
      const [key, value = '1'] = param.split('=');
      acc[key] = value;
      return acc;
    }, {});
  }

  async _write(payload) {
    try {
      return await this._upload(payload);
    } catch(error) {
      // not axios-handled error
      if (!error.response) {
        throw error;
      }
      const { data } = error.response;
      return data !== 'object' ? trimObj({ errors: true, cause: data }) : data;
    }
  }

  async _upload(payload) {
    const { type, async, dryRun, params } = this._options;
    const response = await this._client.upload(type, payload, { async, dryRun, params });
    return response.data;
  }

  _sizeOf(payload) {
    return payload.length * 2;
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

  async _write(payload, { bytes }) {
    const data = await super._write(payload, { bytes });

    // keep track of stats of successful uploads
    if (!data.errors && !isNaN(data.took) && data.took > 0) {
      const { api } = this._stats;
      api.count++;
      api.bytes += bytes;
      api.took += data.took;
    }

    return data;
  }

  get apiBps() {
    const { took, bytes } = this._stats.api;
    return took > 0 ? bytes / took * 1000 : NaN;
  }

  _targetBps() {
    const { bytesPerSecond: configuredBps, apiBpsRate, apiBpsSampleThreshold } = this._options;
    if (apiBpsRate && this._stats.api.bytes < apiBpsSampleThreshold) {
      // use configured BPS until we have enough data from API response
      return configuredBps;
    }
    const { apiBps } = this;
    return !isNaN(apiBps) ? Math.max(apiBps * apiBpsRate, configuredBps) : configuredBps;
  }

}

class ExperimentEventUploadSink extends UploadSink {

  constructor(client, options) {
    super(client, 'experiment-events', options);
  }

  async _upload(payload) {
    const { experimentId } = this._options;
    const response = await this._client.uploadExperimentEvent(experimentId, payload);
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
