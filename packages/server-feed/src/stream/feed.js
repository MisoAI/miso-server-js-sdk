import { parseDuration, startOfDate } from '@miso.ai/server-commons';
import FeedParser from 'feedparser';
import DateFilterStream from './date-filter.js';
import ArticleTransformStream from './transform.js';

export default function feedStream({ parse, after, update, transform } = {}) {
  const threshold = update ? (Date.now() - parseDuration(update)) : startOfDate(after);
  let stream = new FeedParser(parse);
  if (threshold) {
    stream = stream.pipe(new DateFilterStream(threshold));
  }
  if (transform) {
    stream = stream.pipe(new ArticleTransformStream());
  }
  return stream;
}
