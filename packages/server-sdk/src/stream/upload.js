import { stream } from '@miso.ai/server-commons';
import version from '../version.js';
import createSink from './upload-sink.js';
import createBuffer from './upload-buffer.js';
import { process422ResponseBody } from '../api/helpers.js';

export default class UploadStream extends stream.BufferedWriteStream {

  constructor(client, type, {
    name,
    // super
    objectMode,
    heartbeatInterval,
    // sink
    dryRun,
    params,
    experimentId,
    recordsPerSecond,
    bytesPerSecond,
    // buffer
    recordsPerRequest,
    bytesPerRequest,
    extra,
  } = {}) {
    super({
      name,
      type,
      version,
      objectMode,
      heartbeatInterval,
      extra,
    });

    this._client = client;
    this._type = type;

    this._sink = createSink(client, type, {
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
    if (message.event === 'response') {
      // TODO: we can do these near recoverValidRecords()
      const { response, payload } = args;
      if (payload) {
        output.payload = JSON.parse(payload);
        if (response && response.status === 422) {
          output.issues = process422ResponseBody(payload, response);
        }
      }
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
