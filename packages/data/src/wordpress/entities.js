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

  async index() {
    return new EntityIndex(await this.getAll());
  }

}

export class EntityIndex {

  constructor(entities, name) {
    this._name = name;
    this._build(entities);
  }

  _build(entities) {
    this._list = Object.freeze(entities); // TODO: deep freeze
    this._index = asMap(entities);
  }

  get list() {
    return this._list;
  }

  get(id) {
    return this._index[id];
  }

  getName(id) {
    const entity = this._index[id];
    return entity && entity.name;
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
