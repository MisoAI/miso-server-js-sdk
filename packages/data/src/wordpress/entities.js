import { asArray, stream, Resolution } from '@miso.ai/server-commons';

export class Entities {

  constructor(client, name) {
    this._client = client;
    this.name = name;
    this._index = this._createIndex();
    Object.freeze(this);
  }
  
  async stream(options) {
    return this._client._helpers.stream(this.name, options);
  }

  async getAll(options) {
    return stream.collect(await this.stream(options));
  }

  async count(options) {
    return this._client._helpers.count(this.name, options);
  }

  async terms(options) {
    return this._client._helpers.terms(this.name, options);
  }

  get index() {
    return this._index;
  }

  _createIndex() {
    return new EntityIndex(this);
  }

  async _taxonomy(options) {
    return await this._client._helpers.findTaxonomyByResourceName(this.name, options);
  }

}

export class EntityIndex {

  constructor(entities, { process, value } = {}) {
    this._entities = entities;
    if (process) {
      this._process = process;
    }
    if (value) {
      this._value = (en => en && value(en)); // null-safe
    }
    this.name = entities.name;
    this._index = new Map();
    this._notFound = new Set();
    this._fetching = new Map();
  }

  async ready() {
    if (!this._ready) {
      this._ready = this._build();
    }
    return this._ready;
  }

  async _dataReady() {
    await this.ready();
    if (this.hierarchical) {
      return this._allFetched || (this._allFetched = this._fetchAll());
    }
  }

  async _fetchAll() {
    const records = await this._entities.getAll();
    for (const record of records) {
      this._index.set(record.id, record);
    }
    if (this.hierarchical) {
      shimFullPath(records, this._index);
    }
  }

  async _build() {
    const taxonomy = this._taxonomy = await this._entities._taxonomy();
    this.hierarchical = !!(taxonomy && taxonomy.hierarchical);
  }

  async fetch(ids) {
    if (this.hierarchical) {
      return; // already all fetched
    }
    ids = asArray(ids);
    const idSet = new Set(ids);

    const promises = []
    const toFetch = [];
    for (const id of ids) {
      if (this._index.has(id) || this._notFound.has(id)) {
        continue;
      }
      if (!this._fetching.has(id)) {
        this._fetching.set(id, new Resolution());
        toFetch.push(id);
      }
      promises.push(this._fetching.get(id).promise);
    }
    if (toFetch.length > 0) {
      (async () => {
        const stream = await this._entities.stream({ ids: toFetch });
        for await (const entity of stream) {
           const { id } = entity;
           this._index.set(id, this._process(entity));
           idSet.delete(id);
           this._resolveFetch(id);
        }
        // handle unavailable ones
        for (const id of idSet) {
          this._notFound.add(id);
          this._resolveFetch(id);
        }
      })();
    }
    return Promise.all(promises);
  }

  _resolveFetch(id) {
    this._fetching.get(id).resolve();
    this._fetching.delete(id);
  }

  async get(id) {
    await this._dataReady();
    await this.fetch([id]);
    return this._index.get(id);
  }

  async getAll(ids) {
    await this._dataReady();
    await this.fetch(ids);
    return ids.map(id => this._index.get(id));
  }

  async getValue(id) {
    if (id === undefined) {
      return undefined;
    }
    return this._value(await this.get(id));
  }

  async getValues(ids = []) {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.getAll(ids);
    return entities.map(en => this._value(en)).filter(v => v);
  }

  _process(entity) {
    return entity;
  }

  _value(entity) {
    return entity && (this.hierarchical ? entity.fullPath.names : entity.name);
  }

  async patch(post, propName) {
    propName = propName || this.name;
    const { [propName]: ids } = post;
    const value = await (Array.isArray(ids) ? this.getValues(ids) : this.getValue(ids));
    return value ? { [propName]: value } : undefined;
  }

}

function shimFullPath(entities, index) {
  // DP to compute full path
  function fullPath(entity) {
    if (!entity.fullPath) {
      const { parent, id, name } = entity;
      if (parent) {
        const { ids, names } = fullPath(index.get(parent));
        entity.fullPath = {
          ids: [...ids, id],
          names: [...names, name],
        };
      } else {
        entity.fullPath = {
          ids: [id],
          names: [name],
        };
      }
    }
    return entity.fullPath;
  }

  return entities.map(c => {
    fullPath(c);
    return c;
  });
}
