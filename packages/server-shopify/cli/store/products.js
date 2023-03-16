import { stream } from '@miso.ai/server-commons';
import { ShopifyStoreAdminClient } from '../../src/index.js';

function build(yargs) {
  return yargs
    .option('count', {
      alias: 'c',
      describe: 'Count number of products',
      type: 'boolean',
    })
    .option('limit', {
      alias: 'n',
      describe: 'Limit number of products to fetch',
      type: 'number',
    });
}

async function run({ count, ...options }) {
  if (count) {
    await runCount(options);
  } else {
    await runList(options);
  }
}

async function runCount(options) {
  const client = new ShopifyStoreAdminClient(options);
  const count = await client.products.count();
  console.log(count);
}

async function runList(options) {
  const client = new ShopifyStoreAdminClient(options);
  await stream.pipeline(
    client.products.stream(options),
    new stream.OutputStream({
      objectMode: true,
    }),
  );
}

export default {
  command: 'products',
  desc: 'Shopify store products APIs',
  builder: build,
  handler: run,
};
