//import { Readable } from 'stream';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';

const build = type => yargs => {
  return yargs;
};

const run = type => async ({
  key,
  server,
  taskId,
}) => {
  const client = new MisoClient({ key, server });
  let result;
  try {
    result = await client.api[type].status(taskId);
  } catch (err) {
    console.error(err);
    throw err;
  }

  console.log(result);
  /*
  const readStream = Readable.from(ids);
  const outputStream = new stream.OutputStream();

  await stream.pipeline(
    readStream,
    outputStream,
  );
  */
};

export default function(type) {
  return {
    command: 'status <taskId>',
    description: false,
    builder: build(type),
    handler: run(type),
  };
}
