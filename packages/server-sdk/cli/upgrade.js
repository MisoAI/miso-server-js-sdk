import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { stream, UpgradeChannel } from '@miso.ai/server-commons';

function build(yargs) {
  return yargs
    .option('name', {
      describe: 'Channel name',
      type: 'string',
    })
    .option('form', {
      alias: 'm',
      describe: 'Data form',
      type: 'string',
    });
}

async function run(options) {
  if (!options.form) {
    throw new Error('Data form is required: --form <form>');
  }
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
