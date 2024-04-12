import { Readable, Transform } from 'stream';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { defineValues, trimObj } from '@miso.ai/server-commons';

// const STREAM_OPTIONS = ['limit'];

export default class Core {

  constructor(options = {}) {
    const { shop, apiVersion = '2022-10', token, timeout = 5000 } = this._options = options;
    const baseUrl = `https://${shop}.myshopify.com/admin/api/${apiVersion}`;
    defineValues(this, {
      baseUrl,
    });
    this._axios = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
    });
    axiosRetry(this._axios, {
      retries: 5,
      retryDelay: count => count * 300,
    });
    this._start = Date.now();
    this.debug = this.debug.bind(this);
  }

  async fetch(path, options = {}) {
    const { method = 'GET', body, params } = options;
    const { status, data, headers } = await this._axios.request({
      url: path,
      method,
      params,
      data: body,
    });
    // TODO: handle status
    const {
      'x-shopify-shop-api-call-limit': callLimit,
      link,
    } = headers;
    const pageInfo = parseLink(link);
    //this.debug({ path, params, status, pageInfo, callLimit, link });
    return trimObj({ data, pageInfo, callLimit });
  }

  async explain(resource, { count, ids } = {}) {
    const { baseURL, headers = {} } = this._axios.defaults;
    const path = count ? `/${resource}/count.json` : `/${resource}.json`;
    const params = trimObj({
      ids: encodeIds(ids),
    });
    const headersOptions = Object.entries(headers).map(([k, v]) => typeof v === 'string' ? ` -H '${k}: ${v}'` : '').join('');
    const paramsStr = `${new URLSearchParams(params)}`;
    const url = `${baseURL}${path}${paramsStr ? `?${paramsStr}` : ''}`;
    return `curl${headersOptions} '${url}'`;
  }

  async count(resource) {
    return (await this.fetch(`/${resource}/count.json`)).data.count;
  }

  stream(resource, options) {
    return new ShopifyStoreResourceStream(this, resource, options)
      .pipe(new FlatmapStream());
  }

  debug(v) {
    if (this._options.debug) {
      const elapsed = (Date.now() - this._start) / 1000;
      console.error(`[${elapsed}]`, v);
    }
  }

}

function parseLink(link) {
  if (!link) {
    return undefined;
  }
  return link.split(',').reduce((acc, line) => {
    try {
      const [url, rel] = line.trim().split('; rel=');
      if (rel) {
        const pageInfo = new URL(url.slice(1, -1)).searchParams.get('page_info');
        if (pageInfo) {
          acc[rel.slice(1, -1)] = pageInfo;
        }
      }
    } catch(e) {}
    return acc;
  }, {});
}

function encodeIds(ids) {
  return ids && ids.map(s => s.trim()).join(',');
}

// TODO: move to server-commons
class FlatmapStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  _transform(records, _, next) {
    for (const record of records) {
      this.push(record);
    }
    next();
  }

}

class ShopifyStoreResourceStream extends Readable {

  constructor(core, resource, { ids, limit, pageSize = 200 }) {
    super({ objectMode: true });
    this._core = core;
    this._resource = resource;
    this._pageSize = pageSize;
    this._remaining = limit;
    this._params = trimObj({
      ids: encodeIds(ids),
    });
  }

  async _read() {
    if (this._done) {
      this.push(null);
      return;
    }
    const limit = this._remaining !== undefined ? Math.min(this._remaining, this._pageSize) : this._pageSize;
    const params = trimObj({
      ...this._params,
      limit,
      page_info: this._pageInfo,
    });
    const { data, pageInfo } = await this._core.fetch(`/${this._resource}.json`, { params });
    if (pageInfo && pageInfo.next) {
      this._pageInfo = pageInfo.next;
    } else {
      this._done = true;
    }
    let { [this._resource]: records } = data;
    const size = records.length;
    if (this._remaining !== undefined) {
      this._remaining -= size;
      if (this._remaining <= 0) {
        this._done = true;
      }
    }
    if (size < limit) {
      this._done = true;
    } else if (size > limit) {
      records = records.slice(0, limit); // just in case
    }
    this.push(size > 0 ? records : null);
  }

  _debug(...args) {
    this._core.debug(...args);
  }

}
