import { Buffer } from 'buffer';
import fetch, { Headers } from 'node-fetch';
import FeedParser from 'feedparser';

export default async function stream(url, { fetch: fetchOptions, parse: parseOptions } = {}) {
  const { status, body } = await fetch(url, buildFetchOptions(fetchOptions));
  if (status !== 200) {
    throw new Error(`Failed to fetch ${url}: ${status}`);
  }
  return body.pipe(new FeedParser(parseOptions));
}

function buildFetchOptions({ headers, auth, ...options } = {}) {
  headers = new Headers(headers);
  if (auth) {
    if (typeof auth === 'object' && auth.username && auth.password) {
      auth = `${auth.username}:${auth.password}`;
    }
    if (typeof auth !== 'string') {
      throw new TypeError(`Invalid auth: must me a string or an object.`);
    }
    headers.set('Authorization', 'Basic ' + Buffer.from(auth).toString('base64'));
  }
  return {
    ...options,
    headers,
  };
}
