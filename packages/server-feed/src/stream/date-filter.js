import { Transform } from 'stream';

export default class DateFilterStream extends Transform {

  constructor(threshold) {
    super({ objectMode: true });
    this._threshold = threshold;
  }

  _transform(record, _, next) {
    try {
      const timestamp = Date.parse(record.date);
      if (timestamp >= this._threshold) {
        this.push(record);
      }
    } catch (err) {
      console.error(err);
    }
    next();
  }

}
