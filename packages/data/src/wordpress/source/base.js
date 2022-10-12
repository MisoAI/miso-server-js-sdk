import axios from '../../axios.js';

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
    return this._process(response);
  }

  _process({ status, data }) {
    if (status >= 400 && status < 500 && data.code === 'rest_post_invalid_page_number') {
      // out of bound, so there is no more data
      return { data: [], terminate: true };
    }
    if (!this._options.preserveLinks) {
      data = data.map(this._helpers.removeLinks);
    }
    return { data };
  }

  _processFetchResponse(status, data) {
    const state = this._state;
    state.response();

    // TODO: other error status
    if (status >= 400 && status < 500 && data.code === 'rest_post_invalid_page_number') {
      state.finish();
      this._resolveDataPromise();
    } else {
      // until function acts as a terminator to end data fetching
      data = this._processUntil(data);
      const rawDataLength = data.length;

      data = this._postProcess(data);

      if (data.length > 0) {
        this._buckets.push(data);
        this._onFetch && this._onFetch(data);
        state.receive(data.length);
        this._resolveDataPromise();
      } else {
        // just in case
        this._fetchIfNecessaryNextTick();
      }
      // terminating condition
      const shallTerminate = state._ids ?
        (state._ids.length === 0 && state.fetches.requested === state.fetches.returned) :
        (rawDataLength < state._pageSize);
      if (shallTerminate) {
        state.finish();
        this._resolveDataPromise();
      }
    }
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
