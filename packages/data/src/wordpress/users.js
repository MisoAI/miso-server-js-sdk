import { Entities, EntityIndex } from './entities.js';

const RESOURCE_NAME = 'users';

export default class Users extends Entities {

  constructor(client) {
    super(client, RESOURCE_NAME);
  }
  
  async index() {
    return new EntityIndex(await this.getAll(), 'author');
  }

}
