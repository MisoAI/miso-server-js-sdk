import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';

function build(yargs) {
  return yargs
    .positional('file', {
      describe: 'Transform function location',
      default: 'transform.js',
    });
}

async function run({ file }) {
  const transform = await stream.getTransformStream(file);
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

  await pipeline(...streams);
}

export default {
  command: 'transform [file]',
  alias: ['t'],
  description: `Transform records by a JavaScript module [file]. The module should contains a default export of a node Transform stream class. Object modes on both sides are respected.`,
  builder: build,
  handler: run,
};
