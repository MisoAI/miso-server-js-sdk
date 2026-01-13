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

function writeIssuesToData(data, { groups = [] } = {}, { name: channel } = {}) {
  for (const { index, violations = [] } of groups) {
    try {
      const errors = (data[index].errors || (data[index].errors = []));
      errors.push(...(violations.map(v => trimObj({ channel, status: 422, ...v }))));
    } catch(_) {}
  }
}

function writeResponseErrorToFailedData(response, { name: channel } = {}) {
  // 422 errors are already handled by writeIssuesToData
  if (!response.error && (response.status < 400 || response.status === 422)) {
    return;
  }
  const error = trimObj({
    channel, 
    status: response.status,
    message: response.error || response.statusText,
  });
  for (const event of response.failed.data) {
    (event.errors || (event.errors = [])).push({ ...error });
  }
}

export class ChannelApiSink extends WriteChannelSink {

  constructor(client, options) {
    super(options);
    this._client = client;
    // TODO: take axios options?
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
      response = processMisoApiResponse(response);
      response.writes = 1;
      response.successful = { records, data };
      response.failed = { records: 0, data: [] };
    } catch(error) {
      // not axios-handled error
      if (!error.response) {
        throw error;
      }
      response = processMisoApiResponse(error.response);
      if (typeof response !== 'object') {
        response = trimObj({ error: response });
      }
      const { recovered, issues } = error.response;
      // write issues into failed data events
      // TODO: need to add channel name
      writeIssuesToData(data, issues, this._channel);
      // TODO: handle issue.unrecognized

      if (recovered) {
        const [positive, negative] = splitData(data, recovered.product_ids);
        response.writes = 2;
        response.successful = { records: positive.length, data: positive };
        response.failed = { records: negative.length, data: negative };
        response.recovered = processMisoApiResponse(recovered);
      } else {
        response.writes = 1;
        response.successful = { records: 0, data: [] };
        response.failed = { records, data };
      }
    }

    // TODO: need to add channel name
    writeResponseErrorToFailedData(response, this._channel);

    return response;
  }

  async _send(payload) {
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
        await this._runData(event);
        return;
    }
    await super._runCustomTransform(event);
  }

  async _runData(event) {
    await this.writeData(event);
  }

  _createWriteEvent(context) {
    return trimObj({
      ...super._createWriteEvent(context),
      taskId: getTaskIdFromResponse(context.response),
    });
  }

}

function getTaskIdFromResponse(response) {
  return getTaskIdFromResponse0(response) || getTaskIdFromResponse0(response.recovered);
}

function getTaskIdFromResponse0({ body } = {}) {
  return body && body.data && body.data.task_id;
}

function maskApiKeyInMisoUrl(url) {
  // mask the api_key from the url
  return url.replace(/api_key=\w+/, 'api_key=****');
}

export function processMisoApiResponse(response) {
  if (typeof response !== 'object') {
    return response;
  }
  const { data: body, status, statusText, config = {} } = response;
  const { method, url } = config;
  return trimObj({
    status,
    statusText,
    method,
    url: maskApiKeyInMisoUrl(url),
    body,
  });
}
