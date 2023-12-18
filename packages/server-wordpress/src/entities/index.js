import { join } from 'path';
import { Transform } from 'stream';
import { asArray, stream, getYear } from '@miso.ai/server-commons';
import EntityIndex from './entity-index.js';
import EntityTransformStream from './transform.js';
import EntityPresenceStream from './presence.js';
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
    // TODO: when after/before is used and fields are specified, we need to retain only fields that user wants
    if (!resolve && !transform) {
      return this._client._helpers.stream(this.name, options);
    }
    const client = this._client;
    transform = await getTransformFn(client, this.name, transform);

    // we need taxonomy fetched so we know whether it's hierarchical
    const taxonomies = await client._helpers.findAssociatedTaxonomies(this.name);

    // TODO: omit specific indicies by config
    // prepare entity indicies
    const { resources = {} } = client._profile || {};
    const ignored = new Set(resources.ignore || []);

    const indicies = [
      client.users.index,
      client.media.index,
      ...taxonomies.map(({ rest_base }) => client.entities(rest_base).index),
    ].filter(index => !ignored.has(index.name));

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

  async ids(options = {}) {
    return (await this._client._helpers.stream(this.name, { ...options, fields: ['id'] }))
      .pipe(new Transform({
        objectMode: true,
        transform({ id }, _, callback) {
          callback(null, id);
        },
      }));
  }

  async getAll(options) {
    return this.all(options);
  }

  async all(options) {
    return stream.collect(await this.stream(options));
  }

  async count(options) {
    return this._client._helpers.count(this.name, options);
  }

  async terms(options) {
    return this._client._helpers.terms(this.name, options);
  }

  presence(options) {
    return new EntityPresenceStream(this._client, this.name, options);
  }

  async dateRange() {
    // TODO: options?
    return Promise.all([
      getPostDate(this._client, 'asc'),
      getPostDate(this._client, 'desc'),
    ]);
  }

  async yearRange() {
    return (await this.dateRange()).map(getYear);
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

async function getTransformFn(client, name, transform) {
  switch (transform) {
    case 'default':
      return defaultTransform;
    case 'legacy':
      return legacyTransform;
  }
  if (transform === true) {
    const { defaults } = client._profile || {};
    if (!defaults || !defaults.transform || !defaults.transform[name]) {
      return defaultTransform;
    }
    transform = defaults.transform[name];
  }
  if (typeof transform === 'string') {
    // try as file path
    transform = (await import(join(process.env.PWD, transform))).default;
  }
  if (typeof transform === 'function') {
    return post => transform(post, { defaultTransform });
  }
  return undefined;
}

function aggregateIds(records, propName) {
  return Array.from(records.reduce((idSet, record) => {
    for (const id of asArray(record[propName])) {
      idSet.add(id);
    }
    return idSet;
  }, new Set()));
}

async function getPostDate(client, order, options = {}) {
  return (await client.posts.getAll({ ...options, limit: 1, order, fields: ['date_gmt'] }))[0].date_gmt;
}
