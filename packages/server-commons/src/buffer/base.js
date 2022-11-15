export default class BaseBuffer {

  constructor(type, { recordsLimit, bytesLimit }) {
    this._options = {
      type,
      recordsLimit,
      bytesLimit,
    };
  }

  _reset() {
    this._records = this._bytes = 0;
  }

  get config() {
    return Object.freeze({ ...this._options });
  }

  get limit() {
    return this._recordsPerRequest;
  }

  get empty() {
    return this.records === 0;
  }

  get full() {
    const { recordsLimit, bytesLimit } = this._options;
    return (recordsLimit !== undefined && this.records >= recordsLimit) || 
      (bytesLimit !== undefined && this.bytes >= bytesLimit);
  }

  get records() {
    return this._records;
  }

  get bytes() {
    return this._bytes;
  }

  get payload() {
    return this._payload;
  }

  get state() {
    const { records, bytes, payload } = this;
    return Object.freeze({ records, bytes, payload });
  }

  push(record) {
    const dispatches = this._push(record);
    return this.full ? [...dispatches, ...this.flush()] : dispatches;
  }

  _push(record) {
    throw new Error(`Unimplemented.`);
  }

  flush() {
    const { state } = this;
    this._reset();
    return state.records > 0 ? [state] : [];
  }

  destroy() {}

}
