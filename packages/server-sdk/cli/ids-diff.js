import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';

function build(yargs) {
  return yargs
  .option('output', {
    alias: ['out', 'o'],
    describe: 'Output mode',
    choices: ['default', 'plus', 'minus'],
    conflicts: ['plus', 'minus'],
  })
  .option('plus', {
    alias: ['p'],
    describe: 'Only show plus records (those are present in input and absent in Dojo)',
    type: 'boolean',
    conflicts: ['output', 'minus'],
  })
  .option('minus', {
    alias: ['m'],
    describe: 'Only show minus records (those are absent in input and present in Dojo)',
    type: 'boolean',
    conflicts: ['output', 'plus'],
  });
};

const run = type => async ({
  key,
  server,
  output,
  plus,
  minus,
}) => {
  output = output || (plus ? 'plus' : minus ? 'minus' : undefined);

  const client = new MisoClient({ key, server });
  const misoIds = await client.ids(type);

  const diffStream = new stream.DiffStream(misoIds, { output });
  const outputStream = new stream.OutputStream({ objectMode: false });

  await stream.pipeline(
    process.stdin,
    split2(),
    diffStream,
    outputStream,
  );
};

export default function(type) {
  return {
    command: 'diff',
    description: false,
    builder: build,
    handler: run(type),
  };
}
