#!/usr/bin/env node
import { pipeline } from 'stream/promises';
import { yargs, stream } from '@miso.ai/server-commons';
import { version, feedStreams } from '../src/index.js';

yargs.build(yargs => {
  yargs
    .env('MISO_FEED')
    .option('after', {
      alias: 'a',
      describe: 'Only include records after this time',
    })
    .option('update', {
      alias: 'u',
      describe: 'Only include records modified in given duration (3h, 2d, etc.)',
    })
    .option('transform', {
      alias: 't',
      type: 'boolean',
      default: false,
    })
    .option('debug', {
      type: 'boolean',
      default: false,
    })
    .hide('debug')
    .command({
      command: '*',
      description: 'Parse items from feed content',
      handler: run,
    })
    .version(version);
});

async function run(options) {
  await pipeline(
    process.stdin,
    ...feedStreams(options),
    new stream.OutputStream(),
  );
}
