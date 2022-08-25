import { stringify, pipelineToStdout } from '@miso.ai/server-commons';
import { WordPressClient } from '../../src/wordpress/index.js';

function build(yargs) {
  return yargs
    .option('count', {
      alias: 'c',
      describe: 'Return the total number of records',
      type: 'boolean',
    });
}

async function run({ count, ...options }) {
  const client = new WordPressClient(options);
  if (count) {
    await runCount(client, options);
  } else {
    await runGet(client, options);
  }
}

async function runCount(client, options) {
  console.log(await client.users.count(options));
}

async function runGet(client, options) {
  await pipelineToStdout(
    client.users.stream(options),
    stringify(),
  );
}

export default {
  command: 'users',
  aliases: ['user', 'u'],
  desc: 'List users from WordPress REST API',
  builder: build,
  handler: run,
};
