import BaseBuffer from './base.js';

function buildTransformFunction(transform, objectMode) {
  return objectMode ? (
    transform ? v => JSON.stringify(transform(v)) : v => JSON.stringify(v)
  ) : (
    transform ? transform : v => v
  );
}

export default class JsonBuffer extends BaseBuffer {

  constructor({
    prefix = '[',
    suffix = ']',
    separator = ',',
    transform,
    objectMode,
    recordsLimit,
    bytesLimit,
  }) {
    super('json', { recordsLimit, bytesLimit });
    this._format = { prefix, suffix, separator };
    this._transform = buildTransformFunction(transform, objectMode);
    this._affixSize = (prefix.length + suffix.length) * 2;
    this._separatorSize = separator.length * 2;
    this._reset();
  }

  _reset() {
    this._records = 0;
    this._bytes = this._affixSize;
    this._payload = this._format.prefix;
  }

  get payload() {
    return this._payload + this._format.suffix;
  }

  _push(record) {
    let dispatches = [];
    const payload = this._transform(record);
    const { empty } = this;
    const cententSize = payload.length * 2;

    if (!empty) {
      const separatorSize = this._separatorSize;
      if (this._bytes + separatorSize + cententSize > this._options.bytesLimit) {
        // if buffer is not empty and exceeds bytes limit after pushing, then flush right now
        dispatches = this.flush();
      } else {
        // non-empty, not flushed
        this._bytes += separatorSize;
        this._payload += this._format.separator;
      }
    }

    this._records++;
    this._bytes += cententSize;
    this._payload += payload;

    return dispatches;
  }

}
