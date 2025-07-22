import { buildUrl } from './helpers.js';

export default class Experiments {

  constructor(client) {
    this._client = client;
  }

  async uploadEvent(experimentId, record) {
    // TODO: support non-string record
    const url = buildUrl(this._client, `experiments/${experimentId}/events`);
    // TODO: make content type header global
    const headers = { 'Content-Type': 'application/json' };
    const response = await this._client._axios.post(url, record, { headers });
    // 200 response body does not have .data layer
    return response.data ? response : { data: response };
  }

}
