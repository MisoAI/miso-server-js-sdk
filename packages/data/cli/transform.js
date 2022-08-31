import { createRequire } from 'module';
import { join } from 'path';
import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';

const PWD = process.env.PWD;
const require = createRequire(import.meta.url);

function build(yargs) {
  return yargs
    .positional('file', {
      describe: 'Transform function location',
      default: 'transform.js',
    });
}

async function run({ file }) {
  const fn = getFunction(file);
  await stream.pipelineToStdout(
    process.stdin,
    split2(),
    stream.parse(),
    stream.transform(fn, { objectMode: true }),
    stream.stringify(),
  );
}

function getFunction(loc) {
  return require(join(PWD, loc));
}

export default {
  command: 'transform [file]',
  description: `Transform with a JavaScript function`,
  builder: build,
  handler: run,
};
