import { Readable } from 'stream';
import Denque from 'denque';
import { trimObj } from '../object.js';
import TaskQueue from '../task-queue.js';
import Resolution from '../resolution.js';

export default class BufferedReadStream extends Readable {

  constructor(source, { strategy, filter, transform, onLoad, debug } = {}) {
    super({ objectMode: true });
    this._debug = debug || (() => {});
    this._source = source;
    this._strategy = new Strategy(strategy);
    this._state = new State();
    this._loads = new TaskQueue();
    this._buckets = new Denque();

    this._filter = filter || (() => true);
    this._transform = transform || (v => v);
    this._onLoad = onLoad || (() => {});
    this._index = 0;

    this._debug(`[BufferedReadStream] strategy: ${this._strategy}`);
    this._strategy.initialize(this, source);
  }

  async _construct() {
    if (this._source.init) {
      this._debug(`[BufferedReadStream] init source start`);
      await this._source.init();
      this._debug(`[BufferedReadStream] init source done`);
    }
  }

  async _read() {
    const record = await this._next();
    this.push(record != null ? record : null);
  }

  async _next() {
   // TODO: put in action queue to support parallel call
   const bucket = await this._peekBucket();
    if (!bucket) {
      return undefined;
    }
    const record = bucket[this._index++];
    this._state.serve();
    if (this._index >= bucket.length) {
      this._buckets.shift();
      this._index = 0;
    }
    return record;
  }

  async peek() {
   // TODO: put in action queue to support parallel call
   const bucket = await this._peekBucket();
    return bucket && bucket[this._index];
  }

  async _peekBucket() {
    if (this._buckets.isEmpty()) {
      if (this._state.terminated) {
        return undefined;
      }
      this._loadIfNecessary();
      await this._waitForData();
    }
    return this._buckets.isEmpty() ? undefined : this._buckets.peekFront();
  }

  _loadIfNecessaryNextTick() {
    process.nextTick(() => this._loadIfNecessary());
  }

  _loadIfNecessary() {
    if (this._shallLoad()) {
      this._load();
      this._loadIfNecessaryNextTick(true);
    }
  }

  async _load() {
    const request = this._state.request(this._source.request());

    this._debug(`[BufferedReadStream] Load request: ${request}`);
    const { data, ...info } = await this._source.get(request);
    const response = new Response(request, info);
    this._debug(`[BufferedReadStream] Load response: ${JSON.stringify(response)} => data = ${data && data.length}`);

    // TODO: support strategy option: keepOrder = false
    this._loads.push(request.index, () => this._resolveLoad(response, data));
  }

  _resolveLoad(response, records) {
    const state = this._state;
    const strategy = this._strategy;

    state.resolve(response);
    this._debug(`[BufferedReadStream] Load resolved: ${response}`);

    // apply terminate and filter function
    let terminate = false;
    const accepted = [];
    for (const record of records) {
      terminate = terminate || strategy.terminate(record, state);
      if (!terminate && this._filter(record)) {
        state.accept();
        accepted.push(this._transform(record));
      }
      if (terminate) {
        break;
      }
    }
    if (terminate || (this._state.pendingLoads === 0 && this._state.exhausted)) {
      state.terminate();
    }

    if (accepted.length > 0) {
      this._buckets.push(accepted);
      this._onLoad(accepted);
    } else {
      this._loadIfNecessaryNextTick(); // just in case
    }

    if (accepted.length > 0 || state.terminated) {
      this._resolveDataPromise();
    }
  }

  _waitForData() {
    if (this._state.pendingLoads === 0) {
      throw new Error(`No pending loads.`);
    }
    if (this._dataRes) {
      throw new Error(`Parallel bucket peek.`);
    }
    return (this._dataRes = new Resolution()).promise;
  }

  _resolveDataPromise() {
    if (this._dataRes) {
      this._dataRes.resolve();
      this._dataRes = undefined;
    }
  }

  _shallLoad() {
    const state = this._state;
    if (state.exhausted) {
      return false;
    }
    return !state.exhausted && this._strategy.shallLoad(state);
  }

}

class Request {

  constructor(info) {
    this.timestamp = Date.now();
    Object.assign(this, info);
    Object.freeze(this);
  }

  toString() {
    return JSON.stringify(this);
  }

}

class Response {

  constructor({ timestamp, ...request }, info) {
    const now = this.timestamp = Date.now();
    this.took = now - timestamp;
    Object.assign(this, request);
    Object.assign(this, info);
    Object.freeze(this);
  }

  toString() {
    return JSON.stringify(this);
  }

}

class Strategy {

  // TODO: introduce RPS

  constructor({
    highWatermark = 1000,
    eagerLoad = false,
    initialize,
    shallLoad,
    terminate,
  } = {}) {
    this.options = Object.freeze({ highWatermark, eagerLoad });
    // overwrite methods
    Object.assign(this, trimObj({ initialize, shallLoad, terminate }));
  }

  initialize(stream) {
    if (this.options.eagerLoad) {
      stream._loadIfNecessaryNextTick();
    }
  }

  shallLoad(state) {
    // TODO: we can have a slower start
    return state.watermark < this.options.highWatermark;
  }

  terminate(record, state) {
    return false;
  }

  toString() {
    return JSON.stringify(this);
  }

}

class State {

  constructor() {
    this.records = {
      requested: 0,
      resolved: 0,
      accepted: 0,
      served: 0,
    };
    this.loads = {
      requested: 0,
      resolved: 0,
    };
    this.took = 0;
    this.exhausted = false;
    this.terminated = false;
  }

  request({ records, exhaust, ...data }) {
    // note that we may not know how many records will come form this request, so record sum may become NaN
    this.records.requested += records;
    const index = this.loads.requested++;
    if (exhaust) {
      this.exhaust();
    }
    return new Request({ ...data, index, records, exhaust });
  }

  resolve({ records, took, terminate }) {
    // note that we may not know how many records will come form this request, so record sum may become NaN
    this.records.resolved += records;
    this.loads.resolved++;
    this.took += took;
    if (terminate) {
      this.terminate();
    }
  }

  accept() {
    this.records.accepted++;;
  }

  serve() {
    this.records.served++;
  }

  exhaust() {
    this.exhausted = true;
  }

  terminate() {
    this.exhaust();
    this.terminated = true;
  }

  get pendingLoads() {
    const { loads: loads } = this;
    return loads.requested - loads.resolved;
  }

  get pendingRecords() {
    const { records } = this;
    return records.requested - records.resolved;
  }

  get unservedRecords() {
    const { records } = this;
    return records.accepted - records.served;
  }

  get watermark() {
    let { pendingRecords } = this;
    // TODO: better estimated pendingRecords when NaN
    return (isNaN(pendingRecords) ? 0 : pendingRecords) + this.unservedRecords;
  }

}
