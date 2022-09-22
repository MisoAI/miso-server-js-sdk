import { WordPressClient } from '../../src/wordpress/index.js';

function build(yargs) {
  return yargs;
}

async function run(options) {
  const client = new WordPressClient(options);
  const taxonomies = await client.taxonomies({ noCache: true });
  for (const taxonomy of taxonomies) {
    console.log(JSON.stringify(taxonomy) + '\n');
  }
}

export default {
  command: 'taxonomies',
  aliases: ['tax'],
  desc: 'List taxonomies from WordPress REST API',
  builder: build,
  handler: run,
};
