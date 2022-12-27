import { join } from 'path';
import { Transform } from 'stream';
import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';

const PWD = process.env.PWD;

function build(yargs) {
  return yargs
    .positional('file', {
      describe: 'Transform function location',
      default: 'transform.js',
    });
}

async function run({ file }) {
  const transform = await getTransformStream(file);
  const streams = [
    process.stdin,
    split2(),
  ];
  if (transform.writableObjectMode) {
    streams.push(stream.parse());
  }
  streams.push(transform);
  streams.push(new stream.OutputStream({
    objectMode: transform.readableObjectMode,
  }));

  await stream.pipeline(streams);
}

async function getTransformStream(loc) {
  const mod = await import(join(PWD, loc));
  return mod.default ? new mod.default() : new Transform(normalizeOptions(mod));
}

function normalizeOptions({
  objectMode,
  readableObjectMode,
  writableObjectMode,
  ...options
} = {}) {
  readableObjectMode = readableObjectMode !== undefined ? readableObjectMode : objectMode !== undefined ? objectMode : true;
  writableObjectMode = writableObjectMode !== undefined ? writableObjectMode : objectMode !== undefined ? objectMode : true;
  return {
    readableObjectMode,
    writableObjectMode,
    ...options
  };
}

export default {
  command: 'transform [file]',
  alias: ['t'],
  description: `Transform records by a JavaScript module [file]. The module should contains a default export of a node Transform stream class. Object modes on both sides are respected.`,
  builder: build,
  handler: run,
};
