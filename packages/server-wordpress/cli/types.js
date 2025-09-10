import { WordPressClient } from '../src/index.js';

function build(yargs) {
  return yargs;
}

async function run(options) {
  const client = new WordPressClient(options);
  const types = await client.types({ noCache: true });
  for (const type of types) {
    console.log(JSON.stringify(type));
  }
}

export default {
  command: 'types',
  desc: 'List all post types from WordPress REST API',
  builder: build,
  handler: run,
};
