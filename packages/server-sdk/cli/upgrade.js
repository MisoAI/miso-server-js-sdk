import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { stream, UpgradeChannel } from '@miso.ai/server-commons';

function build(yargs) {
  return yargs
    .option('name', {
      describe: 'Channel name',
      type: 'string',
    })
    .option('target-form', {
      alias: 'tf',
      describe: 'Target data form',
      type: 'string',
    })
    .option('id-field', {
      alias: 'id',
      describe: 'Id field',
      type: 'string',
    })
    .demandOption(['target-form']);
}

async function run(options) {
  await pipeline(
    process.stdin,
    split2(),
    new UpgradeChannel({ ...options, objectMode: false }),
    new stream.OutputStream({ objectMode: true }),
  );
}

export default {
  command: ['upgrade', 'up'],
  description: `Upgrade the stream to a channel`,
  builder: build,
  handler: run,
};
