import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import axios from 'axios';
import UploadStream from './stream.js';
import version from './version.js';

export default class MisoClient {

  static version = version;

  constructor(options) {
    this._options = normalizeOptions(options);
    this.version = version;
  }

  async upload(type, records, options) {
    const url = buildUrl(this, type, options);
    const payload = buildPayload(records);
    return await axios.post(url, payload);
  }

  // TODO: extract to .experiment() later
  async uploadExperimentEvent(expId, record) {
    // TODO: support non-string record
    const url = buildUrl(this, `experiments/${expId}/events`);
    const response = await axios.post(url, record, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // 200 response body does not have .data layer
    return response.data ? response : { data: response };
  }

  async getIds(type) {
    const url = buildUrl(this, `${type}/_ids`);
    return (await axios.get(url)).data.data.ids;
  }

  createUploadStream(type, options) {
    return new UploadStream(this, type, options);
  }

  get options() {
    const { server, key } = this._options;
    return Object.freeze({
      server,
      keyMd5: createHash('md5').update(key).digest('hex')
    });
  }

}

function normalizeOptions(options) {
  if (typeof options === 'string') {
    options = { key: options };
  }
  if (!options.key || typeof options.key !== 'string') {
    throw new Error(`API key is required.`);
  }
  options.server = options.server || 'https://api.askmiso.com'

  return options;
}

function buildUrl(client, path, { async, dryRun, params: extraParams } = {}) {
  let { server, key } = client._options;
  let params = `?api_key=${key}`;
  if (dryRun) {
    params += '&dry_run=1';
  } else if (async) {
    params += '&async=1';
  }
  if (extraParams) {
    for (const key in extraParams) {
      // TODO: deal with encodeURIComponent
      params += `&${key}=${extraParams[key]}`;
    }
  }
  return `${server}/v1/${path}${params}`;
}

function buildPayload(records) {
  return typeof records === 'string' ? records :
    Buffer.isBuffer(records) ? records.toString() :
    { data: Array.isArray(records)? records : [records] };
}
