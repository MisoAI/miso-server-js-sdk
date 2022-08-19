import { asMap, collectStream } from '@miso.ai/server-commons';

const RESOURCE_NAME = 'users';

export default class Users {

  constructor(client) {
    this._client = client;
  }
  
  async stream(options) {
    return this._client._helpers.stream(RESOURCE_NAME, options);
  }

  async getAll(options) {
    return collectStream(await this.stream(options));
  }

  count(options) {
    return this._client._helpers.count(RESOURCE_NAME, options);
  }

  async index() {
    return new UserIndex(await this.getAll());
  }

}

class UserIndex {

  constructor(users) {
    this._index = asMap(users);
    this._users = Object.freeze(users);
    this.patch = this.patch.bind(this);
  }

  get users() {
    return this._users;
  }

  getUser(id) {
    return this._index[id];
  }

  getName(id) {
    const user = this._index[id];
    return user && user.name;
  }

  patch(post) {
    const { author } = post;
    const authorName = this.getName(author);
    return authorName ? { ...post, authorName } : post;
  }

}
