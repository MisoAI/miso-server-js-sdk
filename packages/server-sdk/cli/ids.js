import { Readable } from 'stream';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';
import diff from './ids-diff.js';

const build = type => yargs => {
  yargs = yargs
    .command(diff(type));
  // only works for products
  if (type === 'products') {
    yargs = yargs
      .option('type', {
        alias: ['t'],
        describe: 'Only include record of given type',
        type: 'string',
      });
  }
  return yargs;
};

const run = type => async ({
  env,
  key,
  server,
  type: recordType,
  debug,
}) => {
  const client = new MisoClient({ env, key, server, debug });
  let ids;
  try {
    const options = recordType ? { type: recordType } : {};
    ids = await client.api[type].ids(options);
  } catch (err) {
    console.error(err);
    throw err;
  }

  const readStream = Readable.from(ids);
  const outputStream = new stream.OutputStream();

  await stream.pipeline(
    readStream,
    outputStream,
  );
};

export default function(type) {
  return {
    command: 'ids',
    description: `Get all ids in the catalog`,
    builder: build(type),
    handler: run(type),
  };
}
