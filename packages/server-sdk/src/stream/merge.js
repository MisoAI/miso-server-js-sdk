import { Transform } from 'stream';
import { getIdProperty, defaultMerge } from '../api/helpers.js';
import RecordCache from '../api/cache.js';

export default class MergeStream extends Transform {

  constructor(client, type, {
    mergeFn = defaultMerge,
    ...options
  } = {}) {
    super({
      objectMode: true,
    });
    this._client = client;
    this._type = type;
    this._idProp = getIdProperty(type);
    this._mergeFn = mergeFn;
    this._cache = new RecordCache(client, type, options);
  }

  async _transform(record, _, next) {
    const id = record[this._idProp];
    if (!id) {
      this._error(new Error(`Record missing ${this._idProp}.`));
      next();
      return;
    }
    const base = await this._cache.get(id);
    try {
      const merged = await this._mergeFn(base, record);
      merged && this.push(merged);
    } catch (error) {
      this._error(error);
    }
    next();
  }

  _error(error) {
    console.error(error);
  }

}
