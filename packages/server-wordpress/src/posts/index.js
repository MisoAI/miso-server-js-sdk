import Entities from '../entities/index.js';

const RESOURCE_NAME = 'posts';

// TODO: classify post-like entities

export default class Posts extends Entities {

  constructor(client) {
    super(client, RESOURCE_NAME);
  }
  
  async getAll(options = {}) {
    if (!options.ids && !options.limit) {
      // TODO: should be more tolerant
      throw new Error(`Getting all posts is not supported.`);
    }
    return super.getAll(options);
  }

  async index() {
    throw new Error(`Indexing posts is not supported.`);
  }

}
