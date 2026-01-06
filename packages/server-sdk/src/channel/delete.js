import { ChannelApiSink, ApiWriteChannel } from './api.js';
import { batchDelete } from '../api/helpers.js';

// channel //
export default class DeleteChannel extends ApiWriteChannel {

  constructor(client, type, options = {}) {
    super({
      ...options,
      buffer: normalizeBufferOptions(type, options),
      sink: createSink(client, type, options),
    });
  }

}

// buffer //
const DEFAULT_BUFFER_OPTIONS = Object.freeze({
  payloadSuffix: ']}}',
  payloadDelimiter: ',',
  serialize: event => event.id,
  recordCap: 1000,
});

function normalizeBufferOptions(type, {
  bytesPerRequest,
  recordsPerRequest,
  ...options
}) {
  const key = type === 'products' ? 'product_ids' : 'user_ids';
  options = {
    ...DEFAULT_BUFFER_OPTIONS,
    ...options,
    payloadPrefix: `{"data":{"${key}":[`,
  };
  if (recordsPerRequest) {
    options.recordCap = recordsPerRequest;
  }
  if (bytesPerRequest) {
    options.byteCap = bytesPerRequest;
  }
  return options;
}

// sink //
function createSink(client, type, options) {
  switch (type) {
    case 'users':
    case 'products':
      return new ChannelDeleteSink(client, { ...options, type });
    default:
      throw new Error(`Unrecognized type: ${type}`);
  }
}

class ChannelDeleteSink extends ChannelApiSink {

  constructor(client, options) {
    super(client, options);
  }

  async _send(payload) {
    const { type, params } = this._options;
    return batchDelete(this._client, type, payload, { params });
  }

}
