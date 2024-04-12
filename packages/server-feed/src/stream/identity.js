import { Transform } from 'stream';

export default class IdentityStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  _transform(record, _, next) {
    next(undefined, record);
  }

}
