import { Readable } from 'stream';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';
import { buildForApi, buildForSearch } from './utils.js';

function build(yargs) {
  return buildForSearch(buildForApi(yargs))
    .positional('query', {
      describe: 'Search query',
    })
    .option('answer', {
      type: 'boolean',
      describe: 'Return answer',
      default: false,
    });
}

async function run({ query, fq, fl, rows, answer, key, server }) {
  const client = new MisoClient({ key, server });
  const { products } = await client.api.ask.search({ q: query, fq, fl, rows, answer });
  const readStream = Readable.from(products);
  const outputStream = new stream.OutputStream();

  await stream.pipeline(
    readStream,
    outputStream,
  );
}

export default {
  command: 'hybrid-search [query]',
  aliases: ['hs'],
  description: `Hybrid search records by a query.`,
  builder: build,
  handler: run,
};
