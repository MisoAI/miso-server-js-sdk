import axios from 'axios';
import { asArray } from '@miso.ai/server-commons';
import { upload, merge, batchDelete, buildUrl } from './helpers.js';
import UploadStream from '../stream/upload.js';
import DeleteStream from '../stream/delete.js';
import StatusStream from '../stream/status.js';
import MergeStream from '../stream/merge.js';

export class Queries {

  constructor(client, group) {
    this._client = client;
    this._group = group;
  }

  async _run(path, payload, options) {
    // TODO: options
    const url = buildUrl(this._client, `${this._group}/${path}`);
    return (await axios.post(url, payload)).data.data;
  }

}

export class Writable {

  constructor(client, type) {
    this._client = client;
    this._type = type;
  }

  async upload(records, options) {
    return (await upload(this._client, this._type, records, options)).data;
  }

  uploadStream(options = {}) {
    return new UploadStream(this._client, this._type, options);
  }

}

export class Entities extends Writable {

  constructor(client, type) {
    super(client, type);
  }

  async get(id) {
    const url = buildUrl(this._client, `${this._type}/${id}`);
    return (await axios.get(url)).data.data;
  }

  async ids({ type } = {}) {
    const options = type ? { params: { type } } : {};
    const url = buildUrl(this._client, `${this._type}/_ids`, options);
    return (await axios.get(url)).data.data.ids;
  }

  async delete(ids, options = {}) {
    return batchDelete(this._client, this._type, ids, options);
  }

  deleteStream(options = {}) {
    return new DeleteStream(this._client, this._type, options);
  }

  async status(taskId) {
    const url = buildUrl(this._client, `${this._type}/_status/${taskId}`);
    return (await axios.get(url)).data;
  }

  statusStream() {
    return new StatusStream(this._client, this._type);
  }

  async merge(records, options = {}) {
    records = asArray(records);
    return await Promise.all(records.map(record => merge(this._client, this._type, record, options)));
  }

  mergeStream(options = {}) {
    return new MergeStream(this._client, this._type, options);
  }

}
