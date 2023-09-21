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
    // TODO: limit
    this._pageSize = options.pageSize = pageSize;
    this._page = 0;
  }

  async init() {
    await this.total();
  }

  request() {
    const page = this._page++;
    const records = this._pageSize;
    const total = this._totalValue;
    // if we know total, we know when the data is exhausted
    const exhaust = total !== undefined && ((page + 1) * this._pageSize > total + 10); // 10 for a buffer
    return exhaust ? { records, page, exhaust } : { records, page };
  }

  async total() {
    return this._totalPromise || (this._totalPromise = this._fetchTotal());
  }

  async _url(baseUrl, { page }) {
    const head = baseUrl.indexOf('?') < 0 ? '?' : '&';
    return `${baseUrl}${head}page=${page + 1}`;
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
