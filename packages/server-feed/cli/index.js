#!/usr/bin/env node
import { yargs, stream } from '@miso.ai/server-commons';
import { version, feedStream } from '../src/index.js';

yargs.build(yargs => {
  yargs
    .env('MISO_FEED')
    .option('url', {
      type: 'string',
    })
    .option('auth', {
      type: 'string',
    })
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
      command: '* [url]',
      description: 'Read items from feed',
      handler: run,
    })
    .version(version);
});

async function run({ url, auth, after, update, transform } = {}) {
  await stream.pipeline(
    await feedStream(url, { fetch: { auth }, after, update, transform }),
    new stream.OutputStream(),
  );
}
