import { sink, trimObj } from '@miso.ai/server-commons';
import ServiceStats from './service-stats.js';

export default class ApiSink extends sink.BpsSink {

  constructor(client, options) {
    super(options);
    this._client = client;
    this._serviceStats = new ServiceStats();
  }

  _normalizeOptions({
    params,
    ...options
  } = {}) {
    return {
      ...super._normalizeOptions(options),
      ...trimObj({
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

  get serviceStats() {
    return this._serviceStats.snapshot();
  }

  async _write(payload, { records, bytes }) {
    let data;
    try {
      data = await this._execute(payload);
    } catch(error) {
      // not axios-handled error
      if (!error.response) {
        throw error;
      }
      const status = error.response.status;
      data = error.response.data;
      if (typeof data !== 'object') {
        data = trimObj({ status, errors: true, cause: data });
      } else if (status) {
        data = { status, ...data };
      }
      if (error.response.recovered) {
        data.recovered = error.response.recovered;
      }
    }

    // keep track of service stats on successful calls
    // TODO: handle recovered records?
    if (!data.errors) {
      this._serviceStats.track({ records, bytes, took: data.took });
    }

    return data;
  }

  async _execute(payload) {
    throw new Error(`Unimplemented.`);
  }

}
