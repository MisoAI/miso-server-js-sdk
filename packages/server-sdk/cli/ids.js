import { Readable } from 'stream';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';
import diff from './ids-diff.js';

const build = type => yargs => {
  return yargs
    .command(diff(type));
};

const run = type => async ({
  key,
  server,
}) => {
  const client = new MisoClient({ key, server });
  let ids;
  try {
    ids = await client.api[type].ids();
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
    description: false,
    builder: build(type),
    handler: run(type),
  };
}
