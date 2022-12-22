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
    this._format = format || (objectMode ? defaultObjectModeFormat : defaultNonObjectModeFormat);
    this._out = out;
    this._err = err;
  }

  _write(record, _, next) {
    //console.error(record);
    this._out.write(this._format(record) + '\n');
    next();
  }

}

function defaultObjectModeFormat(v) {
  return typeof v === 'object' ? JSON.stringify(v) : `${v}`;
}

function defaultNonObjectModeFormat(v) {
  // TODO: handle buffer
  return v;
}
