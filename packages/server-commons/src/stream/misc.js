import { Transform } from 'stream';
import { pipeline as _pipeline } from 'stream/promises';
import { chain as _chain } from 'stream-chain';

export const chain = _chain;

export function parse({ lenient } = {}) {
  const parsnFn = lenient ? parseJsonIfPossible : JSON.parse;
  return new Transform({
    transform(chunk, _, callback) {
      callback(null, parsnFn(chunk));
    },
    readableObjectMode: true,
  });
}

function parseJsonIfPossible(chunk) {
  try {
    return JSON.parse(chunk);
  } catch(_) {
    return undefined;
  }
}

export function stringify() {
  return new Transform({
    transform(chunk, _, callback) {
      try {
        callback(null, JSON.stringify(chunk) + '\n');
      } catch(e) {
        callback(null, `${chunk}` + '\n');
      }
    },
    writableObjectMode: true,
  });
}

/**
 * @deprecated Use native stream/promises pipeline instead.
 */
export async function pipeline(...streams) {
  const flattened = streams.length === 1 && Array.isArray(streams[0]) ? streams[0] : streams;
  return _pipeline(flattened.filter(Boolean));
}

export async function collect(stream) {
  const records = [];
  for await (const record of stream) {
    records.push(record);
  }
  return records;
}

// from https://github.com/maxogden/concat-stream/issues/66
export async function * concat(...streams) {
  for (const stream of streams) yield * stream
}

export function transform(fn, { transform: _, ...options } = {}) {
  return new Transform({
    ...options,
    async transform(chunk, encoding, next) {
      try {
        next(undefined, await fn(chunk, encoding));
      } catch (error) {
        next(error);
      }
    },
  });
}

export function take(n, { transform: _, ...options } = {}) {
  let count = 0;
  return new Transform({
    ...options,
    transform(chunk, _, next) {
      if (count > n) {
        next(undefined);
        this.end();
      } else {
        next(undefined, chunk);
      }
      count++;
    }
  });
}
