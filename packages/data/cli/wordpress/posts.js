import { stringify, pipelineToStdout, startOfDate, endOfDate, parseDuration, concatFns, transform as toTransformStream, concatStreams } from '@miso.ai/server-commons';
import { WordPressClient, transform as transformFn } from '../../src/wordpress/index.js';

function build(yargs) {
  return yargs
    .option('date', {
      alias: 'd',
      describe: 'Only include records in this year/month/day',
    })
    .option('after', {
      alias: 'a',
      describe: 'Only include records after this time',
    })
    .option('before', {
      alias: 'b',
      describe: 'Only include records before this time',
    })
    .option('update', {
      alias: 'u',
      describe: 'Only include records modified in given duration (3h, 2d, etc.)',
    })
    .option('patch', {
      alias: 'p',
      describe: 'Patch posts with category names and author name',
      type: 'boolean',
    })
    .option('transform', {
      alias: 't',
      describe: 'Transform posts to miso product records',
      type: 'boolean',
    })
    /*
    .option('limit', {
      alias: 'n',
      describe: 'Limit the amount of records',
      type: 'number',
    })
    */
    .option('count', {
      alias: 'c',
      describe: 'Return the total number of records',
      type: 'boolean',
    });
}

async function run({ site, count, update, ...options }) {
  options = normalizeOptions(options);
  const client = new WordPressClient(site);
  if (count) {
    await runCount(client, options);
  } else if (update) {
    await runUpdate(client, update, options);
  } else {
    await runGet(client, options);
  }
}

async function runCount(client, options) {
  console.log(await client.posts.count(options));
}

async function runGet(client, { patch, transform, ...options }) {
  await pipelineToStdout(
    client.posts.stream(options),
    ...await transformStreams(client, patch, transform),
    stringify(),
  );
}

async function runUpdate(client, update, { date, after, before, orderBy, order, patch, transform, ...options }) {
  const now = Date.now();
  update = parseDuration(update);
  const threshold = now - update;
  await pipelineToStdout(
    concatStreams(
      // get recent published
      client.posts.stream({
        ...options,
        after: threshold,
      }),
      // get recent modified, excluding ones already fetched
      client.posts.stream({
        ...options,
        orderBy: 'modified',
        before: threshold,
        until: post => parseDate(post.modified) < threshold,
      })
    ),
    ...await transformStreams(client, patch, transform),
    stringify(),
  );
}

async function transformStreams(client, patch, transform) {
  if (!patch && !transform) {
    return [];
  }
  const [categoryIndex, userIndex] = await Promise.all([
    client.categories.index(),
    client.users.index(),
  ]);
  const fn = transform ?
    concatFns(categoryIndex.patch, userIndex.patch, transformFn) :
    concatFns(categoryIndex.patch, userIndex.patch);
  return [toTransformStream(fn, { objectMode: true })];
}

function normalizeOptions({ date, after, before, ...options }) {
  [after, before] = [startOfDate(date || after), endOfDate(date || before)];
  return { ...options, after, before };
}

function parseDate(value) {
  return Date.parse(`${value}Z`);
}

export default {
  command: 'posts',
  aliases: ['post', 'p'],
  desc: 'Retrieve posts from WordPress REST API',
  builder: build,
  handler: run,
};
