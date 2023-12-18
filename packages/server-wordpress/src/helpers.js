import axios from 'axios';
import axiosRetry from 'axios-retry';
import { asNumber, splitObj, stream } from '@miso.ai/server-commons';
import DataSource from './source/index.js';
import version from './version.js';

const MS_PER_HOUR = 1000 * 60 * 60;

const STREAM_OPTIONS = ['offset', 'strategy', 'filter', 'transform', 'onLoad'];

function createAxios(client) {
  const { auth } = client._options || {};
  const headers = {
    'User-Agent': `MisoBot/${version}`,
  };
  if (auth) {
    if (typeof auth === 'object' && auth.username && auth.password) {
      auth = `${auth.username}:${auth.password}`;
    }
    if (typeof auth !== 'string') {
      throw new TypeError(`Invalid auth: must me a string or an object.`);
    }
    headers['Authorization'] = 'Basic ' + Buffer.from(auth).toString('base64');
  }
  const instance = axios.create({
    headers,
  });
  axiosRetry(instance, { retries: 5, retryDelay: count => count * 300 });
  return instance;
}

export default class Helpers {

  constructor(client) {
    this._start = Date.now();
    this._client = client;
    this._axios = createAxios(client);
    this.url = new Url(this);
    this._samples = {};
    this.debug = this.debug.bind(this);
  }

  get axios() {
    return this._axios;
  }

  async stream(resource, options) {
    const [streamOptions, sourceOptions] = splitObj(options, STREAM_OPTIONS);
    const source = new DataSource(this, resource, sourceOptions);
    return new stream.BufferedReadStream(source, { ...streamOptions, debug: this.debug });
  }

  async sample(resource, { noCache = false } = {}) {
    if (noCache || !this._samples[resource]) {
      // don't await, save the promise
      this._samples[resource] = this._fetchSample(resource);
    }
    return this._samples[resource];
  }

  async _fetchSample(resource) {
    const url = await this.url.build(resource, { page: 0, pageSize: 1 });
    const { data, headers } = await this.axios.get(url);
    if (!data.length) {
      throw new Error(`No record of ${resource} avaliable`);
    }
    this.debug(`Fetched ${resource} sample, total = ${asNumber(headers['x-wp-total'])}`);

    return {
      data: data[0],
      headers,
      terms: this.extractTerms(data[0]),
    };
  }

  async findTaxonomyByResourceName(name, options) {
    const taxonomies = await this.taxonomies(options);
    for (const taxonomy of taxonomies) {
      if (taxonomy.rest_base === name) {
        return taxonomy;
      }
    }
    return undefined;
  }

  async findAssociatedTaxonomies(type, options) {
    // TODO: try using terms()
    type = type === 'posts' ? 'post' : type;
    return (await this.taxonomies(options)).filter(taxonomy => taxonomy.types.includes(type));
  }

  async taxonomies({ noCache = false } = {}) {
    if (noCache || !this._taxonomies) {
      // don't await, save the promise
      this._taxonomies = this._fetchTaxonomies();
    }
    return this._taxonomies;
  }

  async _fetchTaxonomies() {
    const url = await this.url.build('taxonomies');
    const { data } = await this.axios.get(url);
    this.debug(`Fetched taxonomies.`);
    return Object.values(data);
  }

  extractTerms(data) {
    return data._links['wp:term'] || [];
  }

  async count(resource, { offset: _, ...options } = {}) {
    const url = await this.url.build(resource, { ...options, page: 0, pageSize: 1 });
    const { headers } = await this.axios.get(url);
    return asNumber(headers['x-wp-total']);
  }

  async terms(resource, { noCache = false } = {}) {
    return (await this.sample(resource, { noCache })).terms;
  }

  async countUrl(url) {
    url = await this.url.append(url, { page: 0, pageSize: 1 });
    const { headers } = await this.axios.get(url);
    return asNumber(headers['x-wp-total']);
  }

  /**
   * Return the UTC offset in milliseconds for this site.
   */
  async utcOffsetInMs() {
    const profile = this._client._profile;
    if (profile.utcOffset === undefined) {
      // we may call this multiple times but it's ok
      const { data: post } = await this.sample('posts');
      profile.utcOffset = (Date.parse(`${post.date}Z`) - Date.parse(`${post.date_gmt}Z`)) / MS_PER_HOUR;
      this.debug(`Got utcOffset: ${profile.utcOffset}`);
    }
    return profile.utcOffset * MS_PER_HOUR;
  }

  removeLinks({ _links: _, ...record }) {
    return record;
  }

  debug(v) {
    const elapsed = (Date.now() - this._start) / 1000;
    this._client._options.debug && console.error(`[${elapsed}]`, v);
  }

}

class Url {

  constructor(helpers) {
    this._helpers = helpers;
  }

  async build(resource, options) {
    return this.append(`https://${this._helpers._client.site}/wp-json/wp/v2/${resource}`, options);
  }

  // modifiedAfter, modifiedBefore is supported since WordPress 5.7
  // https://make.wordpress.org/core/2021/02/23/rest-api-changes-in-wordpress-5-7/
  async append(url, options = {}) {
    const { after, before, modifiedAfter, modifiedBefore, order, orderBy, page, pageSize, offset, include, exclude } = options;
    let { fields } = options;
    const params = [];

    // TODO: support single id

    // The date is compared against site's local time, not UTC, so we have to work on timezone offset
    if (has(after) || has(before) || has(modifiedAfter) || has(modifiedBefore)) {
      const utcOffset = await this._helpers.utcOffsetInMs();
      has(after) && params.push(`after=${toISOString(after, utcOffset)}`);
      has(before) && params.push(`before=${toISOString(before, utcOffset)}`);
      has(modifiedAfter) && params.push(`modified_after=${toISOString(modifiedAfter, utcOffset)}`);
      has(modifiedBefore) && params.push(`modified_before=${toISOString(modifiedBefore, utcOffset)}`);
    }

    has(order) && params.push(`order=${order}`);
    has(orderBy) && params.push(`orderby=${orderBy}`);
    has(page) && params.push(`page=${page + 1}`); // 0-based to 1-based
    has(pageSize) && params.push(`per_page=${pageSize}`);
    has(offset) && params.push(`offset=${offset}`);
    has(include) && include.length && params.push(`include=${joinIds(include)}`);
    has(exclude) && exclude.length && params.push(`exclude=${joinIds(exclude)}`);
    if (has(fields) && fields.length) {
      // TODO: is this unused?
      if (has(before) && !fields.includes('modified_gmt')) {
        fields = [...fields, 'modified_gmt'];
      }
      params.push(`_fields=${fields.join(',')}`);
    }

    const head = params.length === 0 ? '' : url.indexOf('?') < 0 ? '?' : '&';
    return `${url}${head}${params.join('&')}`;
  }

}

function joinIds(ids) {
  return ids.map(id => encodeURIComponent(`${id}`)).join(',');
}

function has(value) {
  return value !== undefined;
}

function toISOString(ts, utcOffset) {
  return new Date(ts + utcOffset).toISOString();
}
