import { asMap, stream } from '@miso.ai/server-commons';

export class Entities {

  constructor(client, name) {
    this._client = client;
    this._name = name;
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

  async index({ noCache = false } = {}) {
    if (noCache || !this._index) {
      const [taxonomy, entities] = await Promise.all([
        this._taxonomy({ noCache }),
        this.getAll(),
      ]);
      this._index = new EntityIndex(entities, { taxonomy, name: this._name });
    }
    return this._index;
  }

  async _taxonomy(options) {
    return await this._client._helpers.findTaxonomyByResourceName(this._name, options);
  }

}

export class EntityIndex {

  constructor(entities, { name, taxonomy }) {
    this._name = name;
    this._taxonomy = taxonomy;
    this._hierarchical = !!(taxonomy && taxonomy.hierarchical);
    this._build(entities);
  }

  _build(entities) {
    this._index = asMap(entities);
    this._list = this._hierarchical ? shimFullPath(entities, this._index) : entities;
    Object.freeze(this._list); // TODO: deep freeze
  }

  get list() {
    return this._list;
  }

  get(id) {
    return this._index[id];
  }

  getName(id) {
    const entity = this._index[id];
    return entity && (this._hierarchical ? entity.fullPath.names : entity.name);
  }

  getNames(ids = []) {
    return ids.map(id => this.getName(id)).filter(v => v);
  }

  patch(post, propName) {
    propName = propName || this._name;
    const { [propName]: ids, _patch = {} } = post;
    const value = Array.isArray(ids) ? this.getNames(ids) : this.getName(ids);
    if (!value) {
      return post;
    }
    return {
      ...post,
      _patch: {
        ..._patch,
        [propName]: value,
      },
    };
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
