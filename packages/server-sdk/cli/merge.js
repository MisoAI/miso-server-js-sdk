import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';

function build(yargs) {
  return yargs
    .option('file', {
      alias: ['f'],
      describe: 'File that contains the merge function',
    });
}

const run = type => async ({
  key,
  server,
  file,
  ...options
}) => {
  // TODO: load merge function
  const client = new MisoClient({ key, server });
  const mergeStream = client.api[type].mergeStream(options);
  const outputStream = new stream.OutputStream({ objectMode: true });
  await stream.pipeline(
    process.stdin,
    split2(),
    stream.parse(),
    mergeStream,
    outputStream
  );
}

export default function(type) {
  return {
    command: 'merge',
    description: `Merge records with existing ${type} in catalog.`,
    builder: build,
    handler: run(type),
  };
}
