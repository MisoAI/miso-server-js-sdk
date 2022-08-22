import { Readable } from 'stream';
import axios from '../axios.js';
import Denque from 'denque';
import { TaskQueue } from '@miso.ai/server-commons';

export class ResourceStream extends Readable {

  constructor(helpers, url, options) {
    super({ objectMode: true });
    this._buffer = new ResourceBuffer(helpers, url, options);
  }

  async _read() {
    const record = await this._buffer.read();
    record ? this.push(record) : this.push(null);
  }

}

export class ResourceBuffer {

  constructor(helpers, url, { highWatermark = 1000, pageSize = 100, ...options } = {}) {
    this._helpers = helpers;
    this._url = url;
    this._options = { highWatermark, pageSize, ...options };
    // TODO: support initial offset
    this._state = new State({ pageSize });
    this._buckets = new Denque();
    this._responses = new TaskQueue();
    this._index = 0;

    this._fetchIfNecessaryNextTick();
  }

  _fetchIfNecessaryNextTick() {
    process.nextTick(() => this._fetchIfNecessary());
  }

  _fetchIfNecessary() {
    if (this._shallFetch()) {
      this._fetch();
      this._fetchIfNecessaryNextTick(true);
    }
  }

  async peek() {
    // TODO: put in action queue
    const bucket = await this._peekBucket();
    return bucket && bucket[this._index];
  }

  async read() {
    // TODO: put in action queue
    const bucket = await this._peekBucket();
    if (!bucket) {
      return undefined;
    }
    const record = bucket[this._index++];
    if (this._index >= bucket.length) {
      this._buckets.shift()
      this._index = 0;
    }
    this._state.serve();
    return record;
  }

  async _peekBucket() {
    if (this._buckets.isEmpty()) {
      if (this._state.allReturned) {
        return undefined;
      }
      this._fetchIfNecessary();
      await this._waitForData();
    }
    return this._buckets.isEmpty() ? undefined : this._buckets.peekFront();
  }

  _waitForData() {
    const { fetches } = this._state;
    if (fetches.requested <= fetches.returned) {
      throw new Error(`No pending fetch.`);
    }
    if (this._dataPromise) {
      throw new Error(`Parallel bucket peek`);
    }
    const self = this;
    return new Promise((resolve, reject) => {
      self._dataPromise = { resolve, reject };
    });
  }

  _resolveDataPromise() {
    if (this._dataPromise) {
      this._dataPromise.resolve();
      this._dataPromise = undefined;
    }
  }

  _shallFetch() {
    // TODO: we can have a slower start
    return !this._state.allRequested && this._state.watermark < this._options.highWatermark;
  }

  async _fetch() {
    const state = this._state;
    const fetchIndex = state.fetches.requested;

    state.request();

    const url = await this._helpers.url.append(this._url, {
      page: fetchIndex,
      pageSize: this._options.pageSize,
    });

    let { status, data, headers } = await this._axiosGet(url);
    state.updateTotal(Number(headers['x-wp-total']));

    this._responses.push(fetchIndex, () => this._processFetchResponse(status, data));
  }

  async _axiosGet(url) {
    try {
      return await axios.get(url);
    } catch(error) {
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }

  _processFetchResponse(status, data) {
    const state = this._state;
    state.response();

    // TODO: other error status
    if (status == 400 && data.code === 'rest_post_invalid_page_number') {
      state.finish();
      this._resolveDataPromise();
    } else {
      // until function acts as a terminator to end data fetching
      data = this._processUntil(data);
      const rawDataLength = data.length;

      data = this._postProcess(data);

      if (data.length > 0) {
        this._buckets.push(data);
        state.receive(data.length);
        this._resolveDataPromise();
      } else {
        // just in case
        this._fetchIfNecessaryNextTick();
      }
      if (rawDataLength < this._options.pageSize) {
        state.finish();
        this._resolveDataPromise();
      }
    }
  }

  _processUntil(data) {
    const { until } = this._options;
    if (!until) {
      return data;
    }
    const newData = [];
    for (const record of data) {
      if (until(record)) {
        break;
      }
      newData.push(record);
    }
    return newData;
  }

  _postProcess(data) {
    const { preserveLinks, filter } = this._options;
    if (!preserveLinks) {
      data = data.map(this._helpers.removeLinks);
    }
    if (filter) {
      data = data.map(filter);
    }
    return data;
  }

}

class State {

  constructor({ pageSize }) {
    this._pageSize = pageSize;
    this.records = {
      requested: 0,
      returned: 0,
      received: 0,
      served: 0,
    };
    this.fetches = {
      requested: 0,
      returned: 0,
    };
    this.allReturned = false;
  }

  request() {
    this.records.requested += this._pageSize;
    this.fetches.requested++;
  }

  updateTotal(total) {
    this.records.total = total;
  }

  response() {
    this.records.returned += this._pageSize;
    this.fetches.returned++;
  }

  receive(records) {
    this.records.received += records;
  }

  serve() {
    this.records.served++;
  }

  finish() {
    this.allReturned = true;
  }

  get watermark() {
    const { records } = this;
    return records.requested - records.returned + records.received - records.served;
  }

  get allRequested() {
    const { allReturned, records } = this;
    return allReturned || (records.total !== undefined && records.requested >= records.total + 10);
  }

}
