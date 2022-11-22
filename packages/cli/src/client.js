import { asArray } from '@miso.ai/server-commons';
//import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import axios from 'axios';
import version from './version.js';
import LegacyUploadStream from './stream/upload.legacy.js';
import UploadStream from './stream/upload.js';
import DeleteStream from './stream/delete.js';

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
  async uploadExperimentEvent(experimentId, record) {
    // TODO: support non-string record
    const url = buildUrl(this, `experiments/${experimentId}/events`);
    // TODO: make content type header global
    const headers = { 'Content-Type': 'application/json' };
    const response = await axios.post(url, record, { headers });
    // 200 response body does not have .data layer
    return response.data ? response : { data: response };
  }

  async ids(type) {
    const url = buildUrl(this, `${type}/_ids`);
    return (await axios.get(url)).data.data.ids;
  }

  async delete(type, ids) {
    if (type !== 'products' && type !== 'users') {
      throw new Error(`Only products and users are supported: ${type}`);
    }
    ids = asArray(ids);
    if (ids.length === 0) {
      return { data: {} };
    }
    const payload = {
      data: {
        [type === 'products' ? 'product_ids' : 'user_ids']: ids,
      },
    };
    return this._delete(type, payload);
  }

  async _delete(type, payload, options) {
    const url = buildUrl(this, `${type}/_delete`, options);
    const { data } = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return { data };
  }

  createUploadStream(type, options) {
    if (options.legacy) {
      options.heartbeat = options.heartbeatInvertal;
      delete options.heartbeatInvertal;
      return new LegacyUploadStream(this, type, options);
    }
    return new UploadStream(this, type, options);
  }

  createDeleteStream(type, options) {
    return new DeleteStream(this, type, options);
  }

  get options() {
    const { server, key } = this._options;
    return Object.freeze({
      server,
      keyMasked: key.substring(0, 4) + '*'.repeat(Math.max(0, key.length - 4)),
      //keyMd5: createHash('md5').update(key).digest('hex'),
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
