import { Transform } from 'stream';
import { merge } from '../api/helpers.js';

export default class MergeStream extends Transform {

  constructor(client, type, {
    mergeFn,
  } = {}) {
    super({
      objectMode: true,
    });
    this._client = client;
    this._type = type;
    this._mergeFn = mergeFn;
  }

  async _transform(record, _, next) {
    record = await merge(this._client, this._type, record, { mergeFn: this._mergeFn });
    // TODO: respect return value
    this.push(record);
    next();
  }

}
