export default class ServiceStats {

  constructor() {
    this._requests = this._records = this._bytes = this._took = 0;
  }

  track({ records, bytes, took } = {}) {
    if (isNaN(took) || took <= 0) {
      return;
    }
    this._requests++;
    this._bytes += records;
    this._bytes += bytes;
    this._took += took;
  }

  get requests() {
    return this._requests;
  }

  get records() {
    return this._records;
  }

  get bytes() {
    return this._bytes;
  }

  get took() {
    return this._took;
  }

  get bps() {
    const { took, bytes } = this;
    return took > 0 ? (bytes / took * 1000) : NaN;
  }

  snapshot() {
    const { requests, records, bytes, took, bps } = this;
    return Object.freeze({ requests, records, bytes, took, bps });
  }

}
