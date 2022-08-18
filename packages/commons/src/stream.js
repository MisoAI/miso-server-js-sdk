import { Transform, pipeline as _pipeline } from 'stream';

export function stringify() {
  return new Transform({
    transform(chunk, _, callback) {
      callback(null, JSON.stringify(chunk) + '\n');
    },
    writableObjectMode: true,
  });
}

export async function pipelineToStdout(...streams) {
  return new Promise((resolve, reject) => 
    _pipeline(...streams, err => err ? reject(err) : resolve())
      .pipe(process.stdout, { end: false })
  );
}

export async function collectStream(stream) {
  const records = []
  for await (const record of stream) {
    records.push(record)
  }
  return records;
}

export async function * concatStreams(...streams) {
  // if this ain't working
  for (const stream of streams) yield * stream

  // maybe this can 
  // for (const stream of ...streams) {
  //   for await (const data of stream) yield data
  // }
}

export function transform(fn, { transform: _, ...options } = {}) {
  return new Transform({
    ...options,
    transform(chunk, encoding, next) {
      try {
        next(undefined, fn(chunk, encoding));
      } catch (error) {
        next(error);
      }
    },
  });
}
