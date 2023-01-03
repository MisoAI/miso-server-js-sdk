import { Entities } from './base.js';

export default class Users extends Entities {

  constructor(client) {
    super(client, 'users');
  }

}
