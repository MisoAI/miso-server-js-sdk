import { Buffer } from 'buffer';
import axios from 'axios';
import UploadStream from './stream.js';

export default class MisoClient {

  constructor(options) {
    this._options = normalizeOptions(options);
  }

  async upload(type, records, options) {
    const url = buildUrl(this, type, options);
    const payload = buildPayload(records);
    return await axios.post(url, payload);
  }

  createUploadStream(type, options) {
    return new UploadStream(this, type, options);
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

function buildUrl(client, type, { async, dryRun } = {}) {
  let { server, key } = client._options;
  let params = `?api_key=${key}`;
  if (dryRun) {
    params += '&dry_run=1';
  } else if (async) {
    params += '&async=1';
  }
  async = async && !dryRun;
  return `${server}/v1/${type}${params}`;
}

function buildPayload(records) {
  return typeof records === 'string' ? records :
    Buffer.isBuffer(records) ? records.toString() :
    { data: Array.isArray(records)? records : [records] };
}