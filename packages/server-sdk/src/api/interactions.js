import { Writable } from './base.js';

export default class Interactions extends Writable {

  constructor(client) {
    super(client, 'interactions');
  }

  // TODO: delete (by user_ids)

}
