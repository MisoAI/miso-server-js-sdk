import { join } from 'path';
import { stream, startOfDate, endOfDate, parseDuration } from '@miso.ai/server-commons';
import { WordPressClient } from '../../src/wordpress/index.js';
import { buildForEntities, runCount as _runCount, runTerms as _runTerms } from './entities.js';

const PWD = process.env.PWD;

function build(yargs) {
  // TODO: make update, count, terms mutually exclusive
  return buildForEntities(yargs)
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
    .option('ids', {
      describe: 'Specify post ids'
    })
    .option('resolve', {
      alias: 'r',
      describe: 'Attach resolved entities (author, catagories) linked with posts',
      type: 'boolean',
    })
    .option('transform', {
      alias: 't',
      describe: 'Transform posts to miso product records',
    });
    /*
    .option('limit', {
      alias: 'n',
      describe: 'Limit the amount of records',
      type: 'number',
    })
    */
}

async function run({ site, count, terms, update, ...options }) {
  options = normalizeOptions(options);
  const client = new WordPressClient(options);
  if (count) {
    await runCount(client, options);
  } else if (terms) {
    await runTerms(client, options);
  } else if (update) {
    await runUpdate(client, update, options);
  } else {
    await runGet(client, options);
  }
}

async function runCount(client, options) {
  _runCount(client, 'posts', options);
}

async function runTerms(client, options) {
  _runTerms(client, 'posts', options);
}

async function runGet(client, { resolve: resolveLinked, transform, ...options }) {
  transform = await normalizeTransform(transform);
  await stream.pipelineToStdout(
    await client.entities('posts').stream({
      ...options,
      resolveLinked,
      transform,
    }),
    stream.stringify(),
  );
}

async function runUpdate(client, update, { date, after, before, orderBy, order, resolve: resolveLinked, transform, ...options }) {
  transform = await normalizeTransform(transform);
  const now = Date.now();
  update = parseDuration(update);
  const threshold = now - update;
  const posts = client.entities('posts');
  await stream.pipelineToStdout(
    stream.concat(
      ...await Promise.all([
        // get recent published
        posts.stream({
          ...options,
          resolveLinked,
          transform,
          after: threshold,
        }),
        // get recent modified, excluding ones already fetched
        posts.stream({
          ...options,
          resolveLinked,
          transform,
          orderBy: 'modified',
          before: threshold,
          pageSize: 20,
          strategy: {
            highWatermark: 100,
            eagerLoad: true,
            terminate: post => parseDate(post.modified_gmt) < threshold,
          },
        })
      ])
    ),
    stream.stringify(),
  );
}

function normalizeOptions({ date, after, before, ids, ...options }) {
  [after, before] = [startOfDate(date || after), endOfDate(date || before)];
  ids = ids ? `${ids}`.split(',').map(s => s.trim()) : ids;
  return { ...options, after, before, ids };
}

async function normalizeTransform(transform) {
  if (typeof transform === 'string') {
    if (transform === 'default' || transform === 'legacy') {
      return transform;
    }
    return (await import(join(PWD, transform))).default;
  }
  return !!transform;
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
