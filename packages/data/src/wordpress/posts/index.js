import { asArray } from '@miso.ai/server-commons';
import { Entities } from '../entities.js';
import PostTransformStream from './transform.js';

const RESOURCE_NAME = 'posts';

export default class Posts extends Entities {

  constructor(client) {
    super(client, RESOURCE_NAME);
  }
  
  async stream({ resolveLinked = false, transform, ...options } = {}) {
    if (!resolveLinked && !transform) {
      return super.stream(options);
    }

    const client = this._client;

    // we need taxonomy fetched so we know whether it's hierarchical
    const taxonomies = await client._helpers.findAssociatedTaxonomies('post');

    // prepare entity indicies
    const indicies = [
      client.users.index,
      // client.media.index,
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
          index.fetch(aggregateIds(records, PostTransformStream.getPropName(index.name)));
        }
      }
    };  

    // transform stream
    const transformStream = new PostTransformStream(this._client, indicies, { transform });

    return (await super.stream({ ...options, onLoad }))
      .pipe(transformStream);
  }

  async getAll() {
    throw new Error(`Getting all posts is not supported.`);
  }

  async index() {
    throw new Error(`Indexing posts is not supported.`);
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
