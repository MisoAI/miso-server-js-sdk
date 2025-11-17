import { asArray, Resolution } from '@miso.ai/server-commons';

export default class EntityIndex {

  constructor(entities, { process, value, fields } = {}) {
    this._entities = entities;
    if (process) {
      this._process = process;
    }
    if (value) {
      this._value = (en => en && value(en)); // null-safe
    }
    this._fields = fields;
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
    ids = asArray(ids).filter(id => id && Number.isInteger(Number(id))); // discard 0, null, undefined, non-integer

    const promises = []
    const idsToFetch = [];
    for (const id of ids) {
      if (this._index.has(id) || this._notFound.has(id)) {
        continue;
      }
      if (!this._fetching.has(id)) {
        this._fetching.set(id, new Resolution());
        idsToFetch.push(id);
      }
      promises.push(this._fetching.get(id).promise);
    }
    if (idsToFetch.length > 0) {
      (async () => {
        const idsFetchSet = new Set(idsToFetch);
        const stream = await this._entities.stream({ ids: idsToFetch, fields: this._fields });
        for await (const entity of stream) {
           const { id } = entity;
           this._index.set(id, this._process(entity));
           idsFetchSet.delete(id);
           this._resolveFetch(id);
        }
        // handle unavailable ones
        for (const id of idsFetchSet) {
          this._notFound.add(id);
          this._resolveFetch(id);
        }
      })();
    }
    return Promise.all(promises);
  }

  _resolveFetch(id) {
    const res = this._fetching.get(id);
    if (res) {
      res.resolve();
      this._fetching.delete(id);
    }
  }

  async get(id) {
    await this._dataReady();
    await this.fetch([id]);
    return this._index.get(id);
  }

  async getAll(ids) {
    ids = ids.filter(id => id); // discard 0, null, undefined
    await this._dataReady();
    await this.fetch(ids);
    return ids.map(id => this._index.get(id));
  }

  async getValue(id) {
    if (!id) { // 0, null, undefined
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

function shimFullPath(entities, cache) {
  // DP to compute full path
  function fullPath(entity) {
    if (!entity.fullPath) {
      const { parent, id, name } = entity;
      if (parent) {
        const { ids, names } = fullPath(cache.get(parent));
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
