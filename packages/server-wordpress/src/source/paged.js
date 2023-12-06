import { asNumber } from '@miso.ai/server-commons';
import WordPressDataSource from './base.js';

const MAX_PAGE_SIZE = 100;

export default class PagedWordPressDataSource extends WordPressDataSource {

  constructor(helpers, resource, { page: _, limit, ...options } = {}) {
    super(helpers, resource, options);
    const { pageSize = MAX_PAGE_SIZE } = options;
    if (pageSize <= 0) {
      throw new Error(`Page size must be positive: ${pageSize}`);
    }
    if (pageSize > MAX_PAGE_SIZE) {
      throw new Error(`Page size cannot be greater than ${MAX_PAGE_SIZE}: ${pageSize}`);
    }
    this._limit = limit;
    this._pageSize = options.pageSize = pageSize;
    this._page = 0;
  }

  async init() {
    await this.total();
  }

  request() {
    const page = this._page++;
    let records = this._pageSize;
    const limit = combineLimit(this._totalValue, this._limit);
    // if we know total, we know when the data is exhausted
    const exhaust = limit !== undefined && ((page + 1) * this._pageSize > limit);
    if (exhaust && this._limit !== undefined) {
      records = this._limit - (page * this._pageSize);
    }
    return exhaust ? { records, page, exhaust } : { records, page };
  }

  async total() {
    return this._totalPromise || (this._totalPromise = this._fetchTotal());
  }

  async _url(baseUrl, { records, page }) {
    const head = baseUrl.indexOf('?') < 0 ? '?' : '&';
    let url = `${baseUrl}${head}page=${page + 1}`;
    // optimize: if limit < page size we can save much bandwidth
    if (page === 0 && records < this._pageSize) {
      if (url.indexOf('per_page=') > -1) {
        url = url.replace(/per_page=\d+/, `per_page=${records}`);
      } else {
        url += `&per_page=${records}`;
      }
    }
    return url;
  }

  async _fetchTotal() {
    const baseUrl = await this.baseUrl();
    this._debug(`[PagedWordPressDataSource] fetch total for ${baseUrl}`);
    const total = await this._helpers.countUrl(baseUrl);
    this._debug(`[PagedWordPressDataSource] fetch total for ${baseUrl} = ${total}`);
    this._totalValue = total;
    return total;
  }

  _process({ status, data, headers }, meta) {
    const result = super._process({ status, data, headers }, meta);
    const total = asNumber(headers['x-wp-total']);
    if (total !== undefined) {
      result.total = total;
    }
    if (data.length < this._pageSize) {
      result.terminate = true;
    }
    return result;
  }

}

const TOTAL_BUFFER = 10;

function combineLimit(total, limit) {
  return total === undefined ? limit : limit === undefined ? total + TOTAL_BUFFER : Math.min(total + TOTAL_BUFFER, limit);
}
