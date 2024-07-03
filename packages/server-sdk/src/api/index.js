import { asArray } from '@miso.ai/server-commons';
import { merge } from './helpers.js';
import Products from './products.js';
import Users from './users.js';
import Interactions from './interactions.js';
import Experiments from './experiments.js';
import Search from './search.js';
import Recommendation from './recommendation.js';
import MergeStream from '../stream/merge.js';

export default class Api {

  constructor(client) {
    this.products = new Products(client);
    this.users = new Users(client);
    this.interactions = new Interactions(client);
    this.experiments = new Experiments(client);
    this.search = new Search(client);
    this.recommendation = new Recommendation(client);
  }

}
