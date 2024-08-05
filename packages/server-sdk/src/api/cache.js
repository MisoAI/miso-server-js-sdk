import { getIdProperty, shimRecordForMerging } from './helpers.js';

export default class RecordCache {

  constructor(client, type, { records = [], fetch = true, ...options } = {}) {
    this._client = client;
    this._type = type;
    this._idProp = getIdProperty(type);
    this._options = { fetch, ...options };

    let idProp;
    switch (type) {
      case 'products':
        idProp = 'product_id';
        break;
      case 'users':
        idProp = 'user_id';
        break;
      default:
        throw new Error(`Unsupported type: ${type}`);
    }

    this._cache = new Map();

    for (const record of records) {
      this._cache.set(record[idProp], record);
    }
  }

  async get(id) {
    if (!this._cache.has(id)) {
      this._cache.set(id, this._fetch(id)); // don't await
    }
    return this._cache.get(id);
  }

  async _fetch(id) {
    if (this._options.fetch === false) {
      return undefined;
    }
    try {
      return shimRecordForMerging(await this._client.api[this._type].get(id));
    } catch (e) {
      return undefined;
    }
  }

}
