import { Transform } from 'stream';

export default class TransformObjectStream extends Transform {

  constructor({} = {}) {
    super({
      objectMode: true,
    });
  }

  _transform(record, _, next) {
    if (!this._columns) {
      this._columns = record;
      this._len = record.length;
    } else {
      this.push(this._transformRecord(record));
    }
    next();
  }

  _transformRecord(record) {
    const { _len, _columns } = this;
    const result = {};
    for (let i = 0; i < _len; i++) {
      result[_columns[i]] = record[i];
    }
    return result;
  }

}
