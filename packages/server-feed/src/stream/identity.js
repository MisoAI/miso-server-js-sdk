import { Transform } from 'stream';

export default class IdentityStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  async _transform(record, _) {
    this.push(record);
  }

}
