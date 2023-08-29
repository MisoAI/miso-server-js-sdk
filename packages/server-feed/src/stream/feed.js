import { parseDuration, startOfDate } from '@miso.ai/server-commons';
import rawFeedStream from './raw.js';
import DateFilterStream from './date-filter.js';
import ArticleTransformStream from './transform.js';

export default async function feedStream(url, { fetch, parse, after, update, transform } = {}) {
  let stream = await rawFeedStream(url, { fetch, parse });
  const threshold = update ? (Date.now() - parseDuration(update)) : startOfDate(after);
  if (threshold) {
    stream = stream.pipe(new DateFilterStream(threshold));
  }
  if (transform) {
    stream = stream.pipe(new ArticleTransformStream());
  }
  return stream;
}
