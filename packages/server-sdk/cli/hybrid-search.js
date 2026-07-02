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
    .option('exhaust', {
      alias: ['x'],
      type: 'boolean',
      describe: 'Keep reading results until exhausted',
      default: false,
    })
    .option('page-size', {
      alias: ['ps'],
      type: 'number',
      describe: 'Number of rows to read per request when exhausting',
      default: 1000,
    })
    .option('total', {
      alias: ['c', 'count'],
      type: 'boolean',
      describe: 'Return total number of products',
      default: false,
    });
}

async function run({ query, fq, fl, rows, start, answer, exhaust, pageSize, total: returnTotal, env, key, server, debug }) {
  const client = new MisoClient({ env, key, server, debug });

  if (!returnTotal && exhaust) {
    const readStream = client.api.ask.searchStream({ q: query, fq, fl, answer }, { pageSize, start, limit: rows });
    await pipeline(
      readStream,
      new stream.OutputStream(),
    );
    return;
  }

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
