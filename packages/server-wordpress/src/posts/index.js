import Entities from '../entities/index.js';

const RESOURCE_NAME = 'posts';

// TODO: classify post-like entities

export default class Posts extends Entities {

  constructor(client) {
    super(client, RESOURCE_NAME);
  }
  
  async getAll() {
    throw new Error(`Getting all posts is not supported.`);
  }

  async index() {
    throw new Error(`Indexing posts is not supported.`);
  }

}
