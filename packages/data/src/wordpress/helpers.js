import axios from 'axios';
import { ResourceStream } from './stream.js';

export default class Helpers {

  constructor(site) {
    this._site = site;
    this.url = new Url(this);
  }

  stream(resource, { page, pageSize, offset, highWatermark, filter, until, preserveLinks, ...options } = {}) {
    const url = this.url.build(resource, options);
    return new ResourceStream(this, url, { offset, highWatermark, filter, until, preserveLinks });
  }

  async count(resource, { offset: _, ...options } = {}) {
    const url = this.url.build(resource, { ...options, page: 0, pageSize: 1 });
    const { headers } = await axios.get(url);
    return Number(headers['x-wp-total']);
  }

}

class Url {

  constructor(helpers) {
    this._helpers = helpers;
  }

  build(resource, options) {
    return this.append(`https://${this._helpers._site}/wp-json/wp/v2/${resource}`, options);
  }

  // modifiedAfter, modifiedBefore is supported since WordPress 5.7
  // https://make.wordpress.org/core/2021/02/23/rest-api-changes-in-wordpress-5-7/
  append(url, options = {}) {
    const { after, before, order, orderBy, page, pageSize, offset } = options;
    const params = [];

    has(after) && params.push(`after=${toISOString(after)}`);
    has(before) && params.push(`before=${toISOString(before)}`);
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

function toISOString(ts) {
  return new Date(ts).toISOString();
}
