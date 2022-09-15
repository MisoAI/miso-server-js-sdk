import { Transform, pipeline as _pipeline } from 'stream';

export function parse() {
  return new Transform({
    transform(chunk, _, callback) {
      callback(null, JSON.parse(chunk));
    },
    readableObjectMode: true,
  });
}

export function stringify() {
  return new Transform({
    transform(chunk, _, callback) {
      callback(null, JSON.stringify(chunk) + '\n');
    },
    writableObjectMode: true,
  });
}

export async function pipeline(...streams) {
  return new Promise((resolve, reject) =>
    _pipeline(...streams, err => err ? reject(err) : resolve())
  );
}

export async function pipelineToStdout(...streams) {
  return new Promise((resolve, reject) => 
    _pipeline(...streams, err => err ? reject(err) : resolve())
      .pipe(process.stdout, { end: false })
  );
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
