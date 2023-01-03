import Products from './products.js';
import Users from './users.js';
import Interactions from './interactions.js';
import Experiments from './experiments.js';

export default class Api {

  constructor(client) {
    this._client = client;
    this.products = new Products(client);
    this.users = new Users(client);
    this.interactions = new Interactions(client);
    this.experiments = new Experiments(client);
  }

}
