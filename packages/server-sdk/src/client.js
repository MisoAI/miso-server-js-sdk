import version from './version.js';
import Api from './api/index.js';
import { createAxios } from './axios.js';

export default class MisoClient {

  static version = version;

  constructor(options = {}) {
    this._options = options = normalizeOptions(options);
    this._axios = createAxios(options.axios, options.debug); // TODO: pass onRetry() for debug message
    this.version = version;
    this.api = new Api(this);
  }

  get options() {
    const { server, key } = this._options;
    return Object.freeze({
      server,
      keyMasked: key.substring(0, 4) + '*'.repeat(Math.max(0, key.length - 4)),
      //keyMd5: createHash('md5').update(key).digest('hex'),
    });
  }

}

function normalizeOptions(options) {
  if (typeof options === 'string') {
    options = { key: options };
  }
  if (!options.key || typeof options.key !== 'string') {
    throw new Error(`API key is required.`);
  }
  options.server = options.server || 'https://api.askmiso.com'

  return options;
}
