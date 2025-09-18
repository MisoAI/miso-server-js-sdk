import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';

const build = type => yargs => {
  return yargs;
};

const run = type => async ({
  key,
  server,
  taskId,
  debug,
}) => {
  const client = new MisoClient({ key, server, debug });
  if (taskId) {
    runOne(client, type, taskId);
  } else {
    runStream(client, type, { key, server });
  }
};

async function runOne(client, type, taskId) {
  try {
    console.log(JSON.stringify(await client.api[type].status(taskId)));
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function runStream(client, type) {
  await stream.pipeline([
    process.stdin,
    split2(),
    client.api[type].statusStream(),
    new stream.OutputStream({
      objectMode: true,
    }),
  ]);
}

export default function(type) {
  return {
    command: 'status [taskId]',
    description: false,
    builder: build(type),
    handler: run(type),
  };
}
