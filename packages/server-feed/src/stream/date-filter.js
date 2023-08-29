import { Transform } from 'stream';

export default class DateFilterStream extends Transform {

  constructor(threshold) {
    super({ objectMode: true });
    this._threshold = threshold;
  }

  async _transform(record, _) {
    try {
      const timestamp = Date.parse(record.date);
      if (timestamp < this._threshold) {
        this.end();
        return;
      }
    } catch (err) {
      console.error(err);
      this.end();
      return;
    }
    this.push(record);
  }

}
