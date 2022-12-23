import { asArray, stream } from '@miso.ai/server-commons';
import EntityIndex from './entity-index.js';
import EntityTransformStream from './transform.js';
import defaultTransform from './transform-default.js';
import legacyTransform from './transform-legacy.js';

export default class Entities {

  constructor(client, name) {
    this._client = client;
    this.name = name;
    this._index = this._createIndex();
    Object.freeze(this);
  }
  
  async stream({ resolve = false, transform, ...options } = {}) {
    if (!resolve && !transform) {
      return this._client._helpers.stream(this.name, options);
    }
    transform = getTransformFn(transform);

    const client = this._client;

    // we need taxonomy fetched so we know whether it's hierarchical
    const taxonomies = await client._helpers.findAssociatedTaxonomies(this.name);

    // prepare entity indicies
    const indicies = [
      client.users.index,
      client.media.index,
      ...taxonomies.map(({ rest_base }) => client.entities(rest_base).index),
    ];
    await Promise.all(indicies.map(index => index.ready()));
    for (const index of indicies) {
      if (index.hierarchical) {
        index._dataReady(); // kick off fetch all, but don't wait
      }
    }

    // onLoad function, which let us fill index caches more efficiently
    const onLoad = records => {
      for (const index of indicies) {
        if (!index.hierarchical) {
          index.fetch(aggregateIds(records, EntityTransformStream.getPropName(index.name)));
        }
      }
    };

    // transform stream
    const transformStream = new EntityTransformStream(this._client, indicies, { transform });

    return (await this._client._helpers.stream(this.name, { ...options, onLoad }))
      .pipe(transformStream);
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

function aggregateIds(records, propName) {
  return Array.from(records.reduce((idSet, record) => {
    for (const id of asArray(record[propName])) {
      idSet.add(id);
    }
    return idSet;
  }, new Set()));
}

function getTransformFn(transform) {
  return typeof transform === 'function' ? post => transform(post, { defaultTransform }) :
    (transform === true || transform === 'default') ? defaultTransform :
    transform === 'legacy' ? legacyTransform : undefined;
}
