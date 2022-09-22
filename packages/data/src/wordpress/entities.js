import { asMap, stream } from '@miso.ai/server-commons';

export class Entities {

  constructor(client, name) {
    this._client = client;
    this._name = name;
    this._index = new EntityIndex(this);
  }
  
  async stream(options) {
    return this._client._helpers.stream(this._name, options);
  }

  async getAll(options) {
    return stream.collect(await this.stream(options));
  }

  async count(options) {
    return this._client._helpers.count(this._name, options);
  }

  async terms(options) {
    return this._client._helpers.terms(this._name, options);
  }

  get index() {
    return this._index;
  }

  async _taxonomy(options) {
    return await this._client._helpers.findTaxonomyByResourceName(this._name, options);
  }

}

export class EntityIndex {

  constructor(entities) {
    this._entities = entities;
    this._name = entities._name;
  }

  async ready() {
    if (!this._ready) {
      this._ready = this._build();
    }
    return this._ready;
  }

  async _build() {
    const [taxonomy, records] = await Promise.all([
      this._entities._taxonomy(),
      this._entities.getAll(),
    ]);
    this._taxonomy = taxonomy;
    this._hierarchical = !!(taxonomy && taxonomy.hierarchical);
    this._index = asMap(records);
    this._list = this._hierarchical ? shimFullPath(records, this._index) : records;
    Object.freeze(this._list); // TODO: deep freeze
  }

  async list() {
    await this.ready();
    return this._list;
  }

  async get(id) {
    await this.ready();
    return this._index[id];
  }

  async getName(id) {
    if (id === undefined) {
      return undefined;
    }
    await this.ready();
    return this._getName(id);
  }

  _getName(id) {
    if (id === undefined) {
      return undefined;
    }
    const entity = this._index[id];
    return entity && (this._hierarchical ? entity.fullPath.names : entity.name);
  }

  async getNames(ids = []) {
    if (ids.length === 0) {
      return [];
    }
    await this.ready();
    return ids.map(id => this._getName(id)).filter(v => v);
  }

  async patch(post, propName) {
    propName = propName || this._name;
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
        const { ids, names } = fullPath(index[parent]);
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
