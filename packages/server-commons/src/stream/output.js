import { Writable } from 'stream';

export default class OutputStream extends Writable {

  constructor({
    out = process.stdout,
    err = process.stderr,
    format,
    objectMode = true,
  } = {}) {
    super({
      objectMode,
    });
    this._format = format || (v => `${v}`);
    this._out = out;
    this._err = err;
  }

  _writeToSink(record, _, next) {
    this._out.write(this._format(record) + '\n');
    next();
  }

}
