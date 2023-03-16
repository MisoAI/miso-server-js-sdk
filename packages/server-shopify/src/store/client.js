import { defineValues } from '@miso.ai/server-commons';
import Core from './core.js';
import Products from './products.js';

export default class ShopifyStoreAdminClient {

  constructor(options) {
    const core = this._core = new Core(options);
    defineValues(this, {
      products: new Products(core),
    });
  }

}
