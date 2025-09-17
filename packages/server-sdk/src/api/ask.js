import { Queries } from './base.js';

export default class Ask extends Queries {

  constructor(client) {
    super(client, 'ask');
  }

  async search(payload, options = {}) {
    return this._run('search', payload, options);
  }

}
