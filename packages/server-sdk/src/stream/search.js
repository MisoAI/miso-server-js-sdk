import { stream } from '@miso.ai/server-commons';

const { BufferedReadStream } = stream;

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_PARALLEL = 2;

/**
 * A readable stream that keeps pulling search results page by page (using the
 * `start` and `rows` payload options) until the result set is exhausted.
 *
 * It builds upon BufferedReadStream, which issues requests in parallel to hide
 * request latency. We start with a parallelism of 2.
 */
export default function createSearchStream(queries, path, payload = {}, {
  pageSize = DEFAULT_PAGE_SIZE,
  parallel = DEFAULT_PARALLEL,
  start = 0,
  limit,
  ...options
} = {}) {
  if (pageSize <= 0) {
    throw new Error(`Page size must be positive: ${pageSize}`);
  }
  if (parallel <= 0) {
    throw new Error(`Parallel must be positive: ${parallel}`);
  }
  if (limit !== undefined && limit < 0) {
    throw new Error(`Limit must not be negative: ${limit}`);
  }
  const source = new SearchDataSource(queries, path, payload, { pageSize, start, limit });
  return new BufferedReadStream(source, {
    strategy: {
      maxPendingLoads: parallel,
      // allow up to `parallel` in-flight page requests
      highWatermark: pageSize * parallel,
    },
    ...options,
  });
}

class SearchDataSource {

  constructor(queries, path, payload, { pageSize, start, limit }) {
    this._queries = queries;
    this._path = path;
    this._payload = payload;
    this._pageSize = pageSize;
    this._start = start;
    this._limit = limit;
    this._offset = start;
    this._total = undefined;
  }

  request() {
    const start = this._offset;
    let records = this._pageSize;
    // when a limit is set, never read beyond it and shrink the final page
    if (this._limit !== undefined) {
      records = Math.min(records, this._start + this._limit - start);
    }
    this._offset += records;
    // this request exhausts the source if it reaches the limit or the known total
    const exhaust = (this._limit !== undefined && start + records >= this._start + this._limit)
      || (this._total !== undefined && start + records >= this._total);
    const request = { records, start, rows: records };
    return exhaust ? { ...request, exhaust } : request;
  }

  async get({ start, rows }) {
    const { products = [], total } = await this._queries._run(this._path, {
      ...this._payload,
      start,
      rows,
    });
    if (total !== undefined) {
      this._total = total;
    }
    const result = { data: products };
    if (total !== undefined) {
      result.total = total;
    }
    // fewer records than requested means we have reached the end
    if (products.length < rows) {
      result.terminate = true;
    }
    return result;
  }

}
