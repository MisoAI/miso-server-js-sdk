import { TransformObjectStream } from '../../src/csv/index.js';
import { Parser } from 'csv-parse';
import { stream } from '@miso.ai/server-commons';

function build(yargs) {
  return yargs
    .env('MD_CSV')
    .option('object', {
      alias: 'obj',
      describe: 'Output as objects',
      type: 'boolean',
    });
}

async function run({ object, ...options }) {
  // TODO: whitelist parse options
  const transforms = object ? [new TransformObjectStream()] : [];
  await stream.pipelineToStdout(
    process.stdin,
    new Parser(),
    ...transforms,
    stream.stringify(),
  );
}

export default {
  command: 'csv',
  description: `Parse CSV`,
  builder: build,
  handler: run,
};
