import { stream } from '@miso.ai/server-commons';
import { WordPressClient } from '../../src/wordpress/index.js';

export function buildForEntities(yargs) {
  // TODO: make them mutually exclusive
  return yargs
    .option('terms', {
      describe: 'Display terms associated with this type of resource',
      type: 'boolean',
    })
    .option('count', {
      alias: 'c',
      describe: 'Return the total number of records',
      type: 'boolean',
    });
}

function build(yargs) {
  return buildForEntities(yargs)
    .positional('name', {
      describe: 'Resource type',
      type: 'string',
    });
}

async function run({ count, terms, ...options }) {
  const client = new WordPressClient(options);
  (count ? runCount : terms ? runTerms : runGet)(client, options);
}

async function runCount(client, { name, ...options }) {
  console.log(await client.entities(name).count(options));
}

async function runTerms(client, { name, ...options }) {
  console.log(await client.entities(name).terms(options));
}

async function runGet(client, { name, ...options }) {
  await stream.pipelineToStdout(
    client.entities(name).stream(options),
    stream.stringify(),
  );
}

export default {
  command: ['$0 <name>'],
  desc: 'List entities from WordPress REST API',
  builder: build,
  handler: run,
};
