import { Readable } from 'stream';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';

function build(yargs) {
  return yargs;
}

const run = type => async ({
  key,
  server,
}) => {
  const client = new MisoClient({ key, server });
  const ids = await client.ids(type);

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
    builder: build,
    handler: run(type),
  };
}
