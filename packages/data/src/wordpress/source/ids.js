import WordPressDataSource from './base.js';

const PAGE_SIZE = 100;

export default class IdsWordPressDataSource extends WordPressDataSource {

  constructor(helpers, resource, { ids, page: _, limit, ...options } = {}) {
    super(helpers, resource, options);
    if (!Array.isArray(ids)) {
      throw new Error(`ids must be an array: ${ids}`);
    }
    this._pageSize = options.pageSize = PAGE_SIZE;
    this._ids = ids;
    this._page = 0;
  }

  request() {
    const pageSize = this._pageSize;
    const page = this._page++;
    const start = pageSize * page;
    const end = start + pageSize;
    const ids = this._ids.slice(start, end);
    const records = ids.length;
    const exhaust = end >= this._ids.length;
    return exhaust ? { ids, records, exhaust } : { ids, records };
  }

  async _url(baseUrl, { ids }) {
    const head = baseUrl.indexOf('?') < 0 ? '?' : '&';
    return `${baseUrl}${head}include=${joinIds(ids)}`;
  }

}

function joinIds(ids) {
  return ids.map(id => encodeURIComponent(`${id}`)).join(',');
}
