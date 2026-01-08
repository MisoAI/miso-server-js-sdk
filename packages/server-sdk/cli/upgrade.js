import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { stream, UpgradeChannel, splitObj } from '@miso.ai/server-commons';

function build(yargs) {
  return yargs
    .option('name', {
      describe: 'Channel name',
      type: 'string',
    })
    .option('domain', {
      alias: 'd',
      describe: 'Target data domain to upgrade to',
      type: 'string',
    })
    .option('id-field', {
      alias: 'id',
      describe: 'Payload field to use as ID',
      type: 'string',
    })
    .option('as-id', {
      describe: 'Upgrade as ID',
      type: 'boolean',
    })
    .demandOption(['domain']);
}

async function run(options) {
  const [upgradeOptions] = splitObj(options, ['name', 'asId', 'idField', 'domain']);
  await pipeline(
    process.stdin,
    split2(),
    new UpgradeChannel({ objectMode: false, ...upgradeOptions }),
    new stream.OutputStream({ objectMode: true }),
  );
}

export default {
  command: ['upgrade', 'up'],
  description: `Upgrade the stream to a channel`,
  builder: build,
  handler: run,
};
