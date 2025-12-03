import { stream, buffer } from '@miso.ai/server-commons';
import version from '../version.js';
import DeleteSink from './delete-sink.js';
import DeletionStats from './deletion-stats.js';

export default class DeleteStream extends stream.BufferedWriteStream {

  constructor(client, type, {
    name,
    // super
    objectMode,
    heartbeatInterval,
    // sink
    dryRun,
    params,
    recordsPerSecond,
    // buffer
    recordsPerRequest,
  }) {
    super({
      name,
      type,
      version,
      objectMode,
      heartbeatInterval,
    });
    if (type !== 'products' && type !== 'users') {
      throw new Error(`Unsupported type: ${type}`);
    }

    this._client = client;
    this._type = type;

    this._buffer = createBuffer(type, {
      recordsPerRequest,
    });

    this._sink = new DeleteSink(client, {
      type,
      dryRun,
      params,
      recordsPerSecond,
    });

    this._deletionStats = new DeletionStats();
  }

  get serviceStats() {
    return this._sink.serviceStats;
  }

  get deletionStats() {
    return this._deletionStats.snapshot();
  }

  _exportConfig() {
    return {
      client: this._client.options,
      ...super._exportConfig(),
    }
  }

  async _writeToSink(payload, request) {
    const response = await super._writeToSink(payload, request);

    this._deletionStats.track(request, response);

    return response;
  }

  _output(message, args) {
    const output = super._output(message, args);

    // if upload fails, emit extracted payload at response event
    if (message.event === 'response' && args.payload) {
      output.payload = JSON.parse(args.payload);
    }

    // TODO: we should find a way to place deletion stats as a main part in the events

    // add upload stats
    output.state = {
      ...output.state,
      stats: {
        service: this.serviceStats,
        deletion: this.deletionStats,
      },
    };

    return output;
  }

}

const DEFAULT_BUFFER_OPTIONS = Object.freeze({
  suffix: ']}}',
  separator: ',',
  recordsLimit: 1000,
});

function createBuffer(type, {
  recordsPerRequest,
}) {
  const key = type === 'products' ? 'product_ids' : 'user_ids';
  const options = {
    ...DEFAULT_BUFFER_OPTIONS,
    objectMode: true,
    prefix: `{"data":{"${key}":[`,
    transform: v => v.toString(),
  };
  if (recordsPerRequest) {
    options.recordsLimit = recordsPerRequest;
  }
  return new buffer.JsonBuffer(options);
}
