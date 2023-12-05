import { parseDuration, startOfDate } from '@miso.ai/server-commons';
import FeedParser from 'feedparser';
import DateFilterStream from './date-filter.js';
import ArticleTransformStream from './transform.js';
import IdentityStream from './identity.js';

export default function feedStreams({ parse, after, update, transform } = {}) {
  const threshold = update ? (Date.now() - parseDuration(update)) : startOfDate(after);
  const streams = [
    new FeedParser(parse),
  ];
  if (threshold) {
    streams.push(new DateFilterStream(threshold));
  }
  if (transform) {
    streams.push(new ArticleTransformStream());
  }
  if (streams.length === 1) {
    // because Duplex stream is not async iterable
    streams.push(new IdentityStream());
  }
  return streams;
}
