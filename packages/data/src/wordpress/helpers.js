import axios from 'axios';
import { ResourceStream } from './stream.js';

export default class Helpers {

  constructor(site) {
    this._site = site;
    this.url = new Url(this);
    this._samples = {};
  }

  async stream(resource, { page, pageSize, offset, highWatermark, filter, until, preserveLinks, ...options } = {}) {
    const url = await this.url.build(resource, options);
    return new ResourceStream(this, url, { offset, highWatermark, filter, until, preserveLinks });
  }

  async sample(resource) {
    if (!this._samples[resource]) {
      const url = await this.url.build(resource, { page: 0, pageSize: 1 });
      const { data } = await axios.get(url);
      if (!data.length) {
        throw new Error(`No record of ${resource} avaliable`);
      }
      this._samples[resource] = data[0];
    }
    return this._samples[resource];
  }

  async count(resource, { offset: _, ...options } = {}) {
    const url = await this.url.build(resource, { ...options, page: 0, pageSize: 1 });
    const { headers } = await axios.get(url);
    return Number(headers['x-wp-total']);
  }

  /**
   * Return the UTC offset in milliseconds for this site.
   */
  async utcOffset() {
    if (this._utcOffset === undefined) {
      const post = await this.sample('posts');
      this._utcOffset = Date.parse(`${post.date}Z`) - Date.parse(`${post.date_gmt}Z`);
    }
    return this._utcOffset;
  }

  removeLinks({ _links: _, ...record }) {
    return record;
  }

}

class Url {

  constructor(helpers) {
    this._helpers = helpers;
  }

  async build(resource, options) {
    return this.append(`https://${this._helpers._site}/wp-json/wp/v2/${resource}`, options);
  }

  // modifiedAfter, modifiedBefore is supported since WordPress 5.7
  // https://make.wordpress.org/core/2021/02/23/rest-api-changes-in-wordpress-5-7/
  async append(url, options = {}) {
    const { after, before, order, orderBy, page, pageSize, offset } = options;
    const params = [];

    // The date is compared against site's local time, not UTC, so we have to work on timezone offset
    if (has(after) || has(before)) {
      const utcOffset = await this._helpers.utcOffset();
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
