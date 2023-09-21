import axios from '../axios.js';

export default class WordPressDataSource {

  constructor(helpers, resource, options = {}) {
    this._helpers = helpers;
    this._resource = resource;
    this._options = options;
    this._debug(`[WordPressDataSource] constructed for resource: ${resource}.`);
  }

  request() {
    throw new Error(`Unimplemented`);
  }

  async url(request) {
    const baseUrl = await this.baseUrl();
    return this._url(baseUrl, request);
  }

  async baseUrl() {
    return this._baseUrl || (this._baseUrl = this._buildBaseUrl());
  }

  async total() {
    throw new Error(`Unimplemented`);
  }

  async get(request) {
    this._debug(`[WordPressDataSource] get ${JSON.stringify(request)}`);
    const url = await this.url(request);
    this._debug(`[WordPressDataSource] request ${url}`);
    const response =  await this._axiosGet(url);
    this._debug(`[WordPressDataSource] response ${response.status} ${url}`);
    return this._process(response, { url });
  }

  _process({ status, data }, { url }) {
    if (status >= 400 && status < 500 && data.code === 'rest_post_invalid_page_number') {
      // out of bound, so there is no more data
      return { data: [], terminate: true };
    }
    if (!Array.isArray(data)) {
      throw new Error(`Unexpected response from WordPress API for ${url}. Expected an array of objects: ${data}`);
    }
    if (!this._options.preserveLinks) {
      data = data.map(this._helpers.removeLinks);
    }
    return { data };
  }

  async _url(baseUrl, request) {
    throw new Error(`Unimplemented`);
  }

  async _buildBaseUrl() {
    // exclude parameters meant to be dealt with state
    const { page, ...options } = this._options;
    return this._helpers.url.build(this._resource, options);
  }

  async _axiosGet(url) {
    try {
      return await axios.get(url);
    } catch(error) {
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }

  _debug(...args) {
    this._helpers.debug(...args);
  }

}
