import { Queries } from './base.js';

export default class Search extends Queries {

  constructor(client) {
    super(client, 'search');
  }

  async search(payload, options = {}) {
    return this._run('search', payload, options);
  }

  async autocomplete(payload, options = {}) {
    return this._run('autocomplete', payload, options);
  }

  async multipleGet(payload, options = {}) {
    return this._run('mget', payload, options);
  }

}
