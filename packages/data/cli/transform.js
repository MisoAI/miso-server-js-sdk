import { join } from 'path';
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
  const TransformClass = await getTransformClass(file);
  const transform = new TransformClass();
  const streams = [
    process.stdin,
    split2(),
  ];
  if (transform.writableObjectMode) {
    streams.push(stream.parse());
  }
  streams.push(transform);
  if (transform.readableObjectMode) {
    streams.push(stream.stringify());
  }
  await stream.pipelineToStdout(streams);
}

async function getTransformClass(loc) {
  return (await import(join(PWD, loc))).default;
}

export default {
  command: 'transform [file]',
  description: `Transform with a JavaScript function. The default export should be a node Transform stream class. Object modes on both sides are respected.`,
  builder: build,
  handler: run,
};
