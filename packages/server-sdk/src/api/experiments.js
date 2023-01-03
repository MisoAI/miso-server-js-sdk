import axios from 'axios';
import { buildUrl } from './helpers.js';

export default class Experiments {

  constructor(client) {
    this._client = client;
  }

  async uploadEvent(experimentId, record) {
    // TODO: support non-string record
    const url = buildUrl(this, `experiments/${experimentId}/events`);
    // TODO: make content type header global
    const headers = { 'Content-Type': 'application/json' };
    const response = await axios.post(url, record, { headers });
    // 200 response body does not have .data layer
    return response.data ? response : { data: response };
  }

}
