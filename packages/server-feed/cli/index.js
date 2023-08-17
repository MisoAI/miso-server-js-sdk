#!/usr/bin/env node
import { yargs, stream } from '@miso.ai/server-commons';
import version from '../src/version.js';
import { stream as createFeedStream } from '../src/index.js';

yargs.build(yargs => {
  yargs
    .env('MISO_FEED')
    .option('url', {
      type: 'string',
    })
    .option('auth', {
      alias: 'u',
      type: 'string',
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

async function run({ url, auth } = {}) {
  await stream.pipeline(
    await createFeedStream(url, { fetch: { auth } }),
    new stream.OutputStream(),
  );
}
