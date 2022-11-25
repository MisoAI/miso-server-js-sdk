import { stream } from '@miso.ai/server-commons';
import version from '../version.js';
import createSink from './upload-sink.js';
import createBuffer from './upload-buffer.js';

export default class UploadStream extends stream.BufferedWriteStream {

  constructor(client, type, {
    name,
    // super
    objectMode,
    heartbeatInterval,
    // sink
    async,
    dryRun,
    params,
    experimentId,
    recordsPerSecond,
    bytesPerSecond,
    // buffer
    recordsPerRequest,
    bytesPerRequest,
  } = {}) {
    super({
      name,
      type,
      version,
      objectMode,
      heartbeatInterval,
    });

    this._client = client;
    this._type = type;

    this._sink = createSink(client, type, {
      async, 
      dryRun,
      params,
      experimentId,
      recordsPerSecond,
      bytesPerSecond,
    });

    this._buffer = createBuffer(type, {
      objectMode,
      recordsPerRequest,
      bytesPerRequest,
    });
  }

  get serviceStats() {
    return this._sink.serviceStats;
  }

  _exportConfig() {
    return {
      client: this._client.options,
      ...super._exportConfig(),
    }
  }

  _output(message, args) {
    const output = super._output(message, args);

    // if upload fails, emit extracted payload at response event
    if (message.event === 'response' && args.response && args.response.errors && args.payload) {
      output.payload = JSON.parse(args.payload);
    }

    // add upload stats
    output.state = {
      ...output.state,
      stats: {
        service: this.serviceStats,
      },
    };

    return output;
  }

}
