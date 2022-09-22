import { WordPressClient } from '../../src/wordpress/index.js';

function build(yargs) {
  return yargs;
}

async function run(options) {
  const client = new WordPressClient(options);
  console.log(JSON.stringify(await client.taxonomies({ noCache: true })));
}

export default {
  command: 'taxonomies',
  aliases: ['tax'],
  desc: 'List taxonomies from WordPress REST API',
  builder: build,
  handler: run,
};
