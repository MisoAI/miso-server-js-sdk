import { asNumber, splitObj } from '@miso.ai/server-commons';
import axios from '../axios.js';
import { ResourceStream } from './stream.js';

const MS_PER_HOUR = 1000 * 60 * 60;
const STREAM_OPTIONS = ['offset', 'limit', 'strategy', 'filter', 'until', 'preserveLinks'];

export default class Helpers {

  constructor(client) {
    this._start = Date.now();
    this._client = client;
    this.url = new Url(this);
    this._samples = {};
  }

  async stream(resource, { page, ...options } = {}) {
    const [streamOptions, urlOptions] = splitObj(options, STREAM_OPTIONS);
    const url = await this.url.build(resource, urlOptions);
    return new ResourceStream(this, url, streamOptions);
  }

  async sample(resource, { noCache = false } = {}) {
    if (noCache || !this._samples[resource]) {
      // don't await, save the promise
      this._samples[resource] = this._fetchSample(resource)
    }
    return this._samples[resource];
  }

  async _fetchSample(resource) {
    const url = await this.url.build(resource, { page: 0, pageSize: 1 });
    const { data, headers } = await axios.get(url);
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
    for (const taxonomy of Object.values(taxonomies)) {
      if (taxonomy.rest_base === name) {
        return taxonomy;
      }
    }
    return undefined;
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
    const { data } = await axios.get(url);
    this.debug(`Fetched taxonomies.`);
    return data;
  }

  extractTerms(data) {
    return data._links['wp:term'] || [];
  }

  async count(resource, { offset: _, ...options } = {}) {
    const url = await this.url.build(resource, { ...options, page: 0, pageSize: 1 });
    const { headers } = await axios.get(url);
    return asNumber(headers['x-wp-total']);
  }

  async terms(resource, { noCache = false } = {}) {
    return (await this.sample(resource, { noCache })).terms;
  }

  async countUrl(url) {
    url = await this.url.append(url, { page: 0, pageSize: 1 });
    const { headers } = await axios.get(url);
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
    const { after, before, order, orderBy, page, pageSize, offset } = options;
    const params = [];

    // The date is compared against site's local time, not UTC, so we have to work on timezone offset
    if (has(after) || has(before)) {
      const utcOffset = await this._helpers.utcOffsetInMs();
      has(after) && params.push(`after=${toISOString(after, utcOffset)}`);
      has(before) && params.push(`before=${toISOString(before, utcOffset)}`);
    }

    has(order) && params.push(`order=${order}`);
    has(orderBy) && params.push(`orderby=${orderBy}`);
    has(page) && params.push(`page=${page + 1}`); // 0-based to 1-based
    has(pageSize) && params.push(`per_page=${pageSize}`);
    has(offset) && params.push(`offset=${offset}`);

    const head = params.length === 0 ? '' : url.indexOf('?') < 0 ? '?' : '&';
    return `${url}${head}${params.join('&')}`;
  }

}

function has(value) {
  return value !== undefined;
}

function toISOString(ts, utcOffset) {
  return new Date(ts + utcOffset).toISOString();
}
