import { asMap, asArray, stream, Resolution } from '@miso.ai/server-commons';

export class Entities {

  constructor(client, name) {
    this._client = client;
    this.name = name;
    this._index = new EntityIndex(this);
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

  async _taxonomy(options) {
    return await this._client._helpers.findTaxonomyByResourceName(this.name, options);
  }

}

export class EntityIndex {

  constructor(entities) {
    this._entities = entities;
    this.name = entities.name;
    this._index = new Map();
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

    const promises = []
    const toFetch = [];
    for (const id of ids) {
      if (this._index.has(id)) {
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
        for await (const record of stream) {
           const { id } = record;
           this._index.set(id, record);
           this._fetching.get(id).resolve();
           this._fetching.delete(id);
        }
        // TODO: handle unavailable ones
      })();
    }
    return Promise.all(promises);
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

  async getName(id) {
    if (id === undefined) {
      return undefined;
    }
    return this._getNameFromEntity(await this.get(id));
  }

  async getNames(ids = []) {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.getAll(ids);
    return entities.map(en => this._getNameFromEntity(en)).filter(v => v);
  }

  _getNameFromEntity(entity) {
    return entity && (this.hierarchical ? entity.fullPath.names : entity.name);
  }

  async patch(post, propName) {
    propName = propName || this.name;
    const { [propName]: ids } = post;
    const value = await (Array.isArray(ids) ? this.getNames(ids) : this.getName(ids));
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
