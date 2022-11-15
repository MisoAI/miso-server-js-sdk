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
      bytesPerSecond,
    });

    this._buffer = createBuffer(type, {
      objectMode,
      recordsPerRequest,
      bytesPerRequest,
    });

    this._uploadStats = new UploadStats();
  }

  get uploadStats() {
    return this._uploadStats.snapshot();
  }

  _exportConfig() {
    return {
      client: this._client.options,
      ...super._exportConfig(),
    }
  }

  async _writeToSink({ request, payload }) {
    const response = await super._writeToSink({ request, payload });

    // keep track of API service time so we can emit more information to the output
    this._uploadStats.track(request, response);

    return response;
  }

  _output(message, args) {
    const output = super._output(message, args);

    // if upload fails, emit extracted payload at response event
    if (message.event === 'response' && args.response && args.response.errors && args.payload) {
      output.payload = JSON.parse(args.payload);
    }

    // add upload stats
    output.uploadStats = this.uploadStats;

    return output;
  }

}

class UploadStats {

  constructor() {
    this._api = { bytes: 0, took: 0, requests: 0 };
  }

  track(request, response) {
    const { took } = response;
    if (!isNaN(took) && took > 0) {
      const api = this._api;
      api.bytes += request.bytes;
      api.took += took;
      api.requests++;
    }
  }

  get api() {
    return Object.freeze({
      ...this._api,
      bps: this.apiBps,
    });
  }

  get apiBps() {
    const { took, bytes } = this._api;
    return took > 0 ? (bytes / took * 1000) : NaN;
  }

  snapshot() {
    const { api } = this;
    return Object.freeze({ api });
  }

}