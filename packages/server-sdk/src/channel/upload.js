import { ChannelApiSink, ApiWriteChannel } from './api.js';
import { upload } from '../api/helpers.js';

// channel //
export default class UploadChannel extends ApiWriteChannel {

  constructor(client, type, { name = 'upload', ...options } = {}) {
    super(client, type, {
      ...options,
      name,
      buffer: normalizeBufferOptions(type, options),
      sink: createSink(client, type, options),
    });
  }

}

// buffer //
const DEFAULT_BUFFER_OPTIONS = Object.freeze({
  payloadPrefix: '{"data":[',
  payloadSuffix: ']}',
  payloadDelimiter: ',',
  byteCap: 1024 * 1024,
});

function normalizeBufferOptions(type, { recordsPerRequest, bytesPerRequest, ...options } = {}) {
  options = { ...DEFAULT_BUFFER_OPTIONS, ...options };
  switch (type) {
    case 'users':
    case 'products':
      options.recordCap = recordsPerRequest || 200;
      break;
    case 'interactions':
      options.recordCap = recordsPerRequest || 1000;
      break;
    default:
      throw new Error(`Unrecognized type: ${type}`);
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
    case 'interactions':
      return new ChannelUploadSink(client, { ...options, type });
    default:
      throw new Error(`Unrecognized type: ${type}`);
  }
}

class ChannelUploadSink extends ChannelApiSink {

  constructor(client, options) {
    super(client, options);
  }

  async _send(payload) {
    const { type, dryRun, params } = this._options;
    const { data } = await upload(this._client, type, payload, { recoverValidRecordsOn422: true, dryRun, params });
    return data;
  }

}
