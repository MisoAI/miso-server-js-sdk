import { Transform } from 'stream';
import axios from '../axios.js';

export default class EntityPresenceStream extends Transform {

  constructor(client, name, {
    present = true,
    fetchSize = 20,
    preserveOrder = true,
  } = {}) {
    super();
    this._client = client;
    this._name = name;
    this._options = {
      present,
      fetchSize,
      preserveOrder,
    }
    this._inputs = [];
    this._pendingSet = new Set();
    this._requests = [];
    this._map = new Map();
    this._done = false;
  }

  async _transform(id, _, next) {
    id = `${id}`; // buffer -> string
    if (id) {
      this._inputs.push(id);
      this._outputAll();
      this._requestAll();
    }
    next();
  }

  _flush(done) {
    this._done = done;
    this._outputAll();
    if (this._inputs.length > 0) {
      this._requestAll(true);
    }
  }

  _outputAll() {
    // TODO: implement when preserveOrder = false
    let i = 0;
    for (const len = this._inputs.length; i < len; i++) {
      const id = this._inputs[i];
      const entry = this._map.get(id);
      if (!entry || entry.value === undefined) {
        break;
      }
      if (this._options.present === entry.value) {
        this.push(id);
      }
    }
    if (i > 0) {
      this._inputs = this._inputs.slice(i);
    }
    if (this._done && this._inputs.length === 0) {
      this._done();
    }
  }

  _requestAll(flush = false) {
    for (const id of this._inputs) {
      this._fetchAll();
      if (!this._map.has(id)) {
        this._map.set(id, { status: 'pending' });
        this._pendingSet.add(id);
      }
    }
    this._fetchAll(flush);
  }

  async _fetchAll(flush = false) {
    if (!flush && this._pendingSet.size < this._options.fetchSize) {
      return;
    }
    const ids = Array.from(this._pendingSet);
    for (const id of ids) {
      this._map.get(id).status = 'fetching';
    }
    this._pendingSet = new Set();

    const presences = await this._fetch(ids);

    for (const id of ids) {
      const entry = this._map.get(id);
      entry.status = 'ready';
      entry.value = presences.has(id);
    }
    this._outputAll();
  }

  async _fetch(ids) {
    const url = await this._client._helpers.url.build(this._name, { include: ids, fields: ['id'] });
    const { data } = await axios.get(url);
    const presences = new Set();
    for (const { id } of data) {
      presences.add(`${id}`);
    }
    return presences;
  }

}
