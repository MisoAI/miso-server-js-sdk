import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
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
    })
    .option('start', {
      type: 'number',
    })
    .option('total', {
      type: 'boolean',
      alias: ['c', 'count'],
      describe: 'Return total number of products',
      default: false,
    });
}

async function run({ query, fq, fl, rows, start, answer, total: returnTotal, env, key, server, debug }) {
  const client = new MisoClient({ env, key, server, debug });
  const { products, total } = await client.api.ask.search({ q: query, fq, fl, rows, start, answer });

  if (returnTotal) {
    console.log(total);
    return;
  }

  const readStream = Readable.from(products);
  const outputStream = new stream.OutputStream();

  await pipeline(
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
