import { asMap, stream } from '@miso.ai/server-commons';

const RESOURCE_NAME = 'users';

export default class Users {

  constructor(client) {
    this._client = client;
  }
  
  async stream(options) {
    return this._client._helpers.stream(RESOURCE_NAME, options);
  }

  async getAll(options) {
    return stream.collect(await this.stream(options));
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
    const { author: author_id, _patch = {} } = post;
    const author = this.getName(author_id);
    if (!author) {
      return post;
    }
    return {
      ...post,
      _patch: {
        ..._patch,
        author,
      },
    };
  }

}
