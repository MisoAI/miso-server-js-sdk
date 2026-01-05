function defaultSerialize(record) {
  return typeof record === 'string' ? record : JSON.stringify(record);
}

function normalizeOptions({
  payloadPrefix = '[',
  payloadSuffix = ']',
  payloadDelimiter = ',',
  serialize = defaultSerialize,
  recordCap,
  byteCap,
} = {}) {
  if (!recordCap && !byteCap) {
    throw new Error('At least one of recordCap or byteCap must be specified.');
  }
  if (typeof serialize !== 'function') {
    throw new Error('serialize must be a function.');
  }
  return {
    payloadPrefix,
    payloadSuffix,
    payloadDelimiter,
    serialize,
    recordCap,
    byteCap,
  };
}

export default class WriteChannelBuffer {

  constructor(options) {
    this._options = options = normalizeOptions(options);
    this._affixSize = (options.payloadPrefix.length + options.payloadSuffix.length) * 2;
    this._clear();
  }

  _clear() {
    this._records = 0;
    this._bytes = this._affixSize;
    this._payload = this._options.payloadPrefix;
    this._data = [];
  }

  /**
   * Returns true if the buffer is empty.
   */
  get empty() {
    return this._records === 0;
  }

  /**
   * Returns true if the buffer is full.
   */
  get full() {
    const { recordCap, byteCap } = this._options;
    return (recordCap !== undefined && this._records >= recordCap) || 
      (byteCap !== undefined && this._bytes >= byteCap);
  }

  /**
   * Take a data event and push it into the buffer.
   * Returns an array of requests if the buffer is full, or an empty array otherwise.
   * @returns An array of requests.
   */
  push(event) {
    const { payload } = event;
    let dispatches = [];
    const serializedPayload = this._options.serialize(payload);
    const contentSize = serializedPayload.length * 2;
    const { empty } = this;

    if (!empty) {
      const delimiterSize = this._options.payloadDelimiter.length * 2;
      if (this._bytes + delimiterSize + contentSize > this._options.byteCap) {
        // if buffer is not empty and exceeds bytes limit after pushing, then flush right now
        dispatches = this.flush();
      } else {
        // non-empty, not flushed
        this._bytes += delimiterSize;
        this._payload += this._options.payloadDelimiter;
      }
    }

    this._records++;
    this._bytes += contentSize;
    this._payload += serializedPayload;
    this._data.push(event);

    // it's possible that the new record is so large that the buffer is instantly full even after a flush
    // in this case, the buffer generates two dispatches from the push
    if (this.full) {
      dispatches = [...dispatches, ...this.flush()];
    }

    return dispatches;
  }

  /**
   * Flush the buffer, which returns an array of requests (which can be empty) and reset the buffer to empty state.
   * @returns An array of requests.
   */
  flush() {
    if (this.empty) {
      return [];
    }
    const records = this._records;
    const bytes = this._bytes;
    const payload = this._payload + this._options.payloadSuffix;
    const data = this._data;
    this._clear();
    return [{ payload, records, bytes, data }];
  }

  destroy() {}

}
