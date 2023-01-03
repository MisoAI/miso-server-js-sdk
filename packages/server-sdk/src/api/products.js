import { Entities } from './base.js';

export default class Products extends Entities {

  constructor(client) {
    super(client, 'products');
  }

}
