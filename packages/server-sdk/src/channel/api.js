import { WriteChannelSink, WriteChannel, trimObj } from '@miso.ai/server-commons';

export function normalizeApiSinkGateOptions({
  writesPerSecond = 10,
  recordsPerSecond = 100000,
  bytesPerSecond = 100 * 1024 * 1024,
  ...options
} = {}) {
  return {
    writesPerSecond,
    recordsPerSecond,
    bytesPerSecond,
    ...options,
  };
}

function normalizeParams(params) {
  if (!params || params.length === 0) {
    return undefined;
  }
  return params.reduce((acc, param) => {
    const [key, value = '1'] = param.split('=');
    acc[key] = value;
    return acc;
  }, {});
}

function splitData(data, ids) {
  ids = new Set(ids);
  const positive = [];
  const negative = [];
  for (const record of data) {
    if (ids.has(record.id)) {
      positive.push(record);
    } else {
      negative.push(record);
    }
  }
  return [positive, negative];
}

export class ChannelApiSink extends WriteChannelSink {

  constructor(client, options) {
    super(options);
    this._client = client;
  }

  _normalizeOptions({
    params,
    dryRun,
    ...options
  } = {}) {
    return trimObj({
      ...super._normalizeOptions(options),
      params: normalizeParams(params),
      dryRun: !!dryRun,
    });
  }

  async _write(request) {
    const { payload, records, data } = request;
    let response;
    try {
      response = await this._send(payload);
      response.successful = { records, data };
      response.failed = { records: 0, data: [] };
    } catch(error) {
      // not axios-handled error
      if (!error.response) {
        throw error;
      }
      const status = error.response.status;
      response = error.response.data;
      if (typeof response !== 'object') {
        response = trimObj({ status, errors: true, cause: response });
      } else if (status) {
        response = { status, ...response };
      }
      const { recovered, issues } = error.response;
      if (recovered) {
        const [positive, negative] = splitData(data, recovered.product_ids);
        response.successful = { records: positive.length, data: positive };
        response.failed = { records: negative.length, data: negative };
      } else {
        response.successful = { records: 0, data: [] };
        response.failed = { records, data };
      }
      if (issues) {
        response.issues = issues;
      }
    }

    return response;
  }

  async _send(request) {
    throw new Error(`Unimplemented.`);
  }

}

export class ApiWriteChannel extends WriteChannel {

  constructor(client, type, options = {}) {
    super({
      ...options,
      sinkGate: normalizeApiSinkGateOptions(options),
    });
    this._client = client;
    this._type = type;
  }

  async _runCustomTransform(event) {
    switch (event.type) {
      case 'data':
        if (event.form === 'miso') {
          await this._runMisoData(event);
        }
      default:
    }
    await super._runCustomTransform(event);
  }

  async _runMisoData(event) {
    await this.writeData(event);
  }

}
