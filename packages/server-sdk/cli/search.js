import { Readable } from 'stream';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';
import { buildForApi, buildForSearch } from './utils.js';

function build(yargs) {
  return buildForSearch(buildForApi(yargs))
    .positional('query', {
      describe: 'Search query',
    });
}

async function run({ query, fq, fl, rows, env, key, server, debug }) {
  const client = new MisoClient({ env, key, server, debug });
  const records = await client.api.search.search({ q: query, fq, fl, rows });
  const readStream = Readable.from(records);
  const outputStream = new stream.OutputStream();

  await stream.pipeline(
    readStream,
    outputStream,
  );
}

export default {
  command: 'search [query]',
  description: `Search records by a query.`,
  builder: build,
  handler: run,
};
