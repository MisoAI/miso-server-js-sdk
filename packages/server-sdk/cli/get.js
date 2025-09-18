import { MisoClient } from '../src/index.js';
import { formatError } from './utils.js';

const build = yargs => yargs;

const run = type => async ({
  key,
  server,
  id,
  debug,
}) => {
  const client = new MisoClient({ key, server, debug });
  try {
    const entity = await client.api[type].get(id);
    console.log(JSON.stringify(entity));
  } catch (err) {
    console.error(formatError(err));
  }
};

export default function(type) {
  return {
    command: 'get [id]',
    description: `Get ${type}`,
    builder: build,
    handler: run(type),
  };
}
