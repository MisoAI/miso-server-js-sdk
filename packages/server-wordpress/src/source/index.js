import PagedWordPressDataSource from './paged.js';
import IdsWordPressDataSource from './ids.js';

export default function source(helpers, resource, options) {
  const DataSource = options.ids ? IdsWordPressDataSource : PagedWordPressDataSource;
  return new DataSource(helpers, resource, options);
}
