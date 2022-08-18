const RESOURCE_NAME = 'posts';

export default class Posts {

  constructor(client) {
    this._client = client;
  }
  
  stream(options) {
    return this._client._helpers.stream(RESOURCE_NAME, options);
  }

  count(options) {
    return this._client._helpers.count(RESOURCE_NAME, options);
  }

}
