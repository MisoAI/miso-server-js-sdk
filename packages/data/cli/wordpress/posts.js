import {
  stream,
  startOfDate,
  endOfDate,
  parseDuration,
} from '@miso.ai/server-commons';
import {
  WordPressClient,
  transform as transformFn,
  transformLegacy,
} from '../../src/wordpress/index.js';
import { buildForEntities, runCount as _runCount, runTerms as _runTerms } from './entities.js';

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
    .option('patch', {
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
    .option('legacy', {
      describe: 'Use legacy transform function',
      type: 'boolean',
    });
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

async function runGet(client, { patch, transform, legacy, ...options }) {
  await stream.pipelineToStdout(
    await client.entities('posts').stream(options),
    ...await transformStreams(client, patch, transform, legacy),
    stream.stringify(),
  );
}

async function runUpdate(client, update, { date, after, before, orderBy, order, patch, transform, legacy, ...options }) {
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
          after: threshold,
        }),
        // get recent modified, excluding ones already fetched
        posts.stream({
          ...options,
          orderBy: 'modified',
          before: threshold,
          strategy: {
            pageSize: 20,
            highWatermark: 100,
            waitForTotal: false,
            fetchBeforeFirstRead: true,
          },
          until: post => parseDate(post.modified_gmt) < threshold,
        })
      ])
    ),
    ...await transformStreams(client, patch, transform, legacy),
    stream.stringify(),
  );
}

async function transformStreams(client, patch, transform, legacy) {
  if (!patch && !transform) {
    return [];
  }
  const fn = transform ? (legacy ? transformLegacy : transformFn) : undefined;
  return [stream.transform(buildPatchAndTransformFn(client, fn), { objectMode: true })];
}

function normalizeOptions({ date, after, before, ...options }) {
  [after, before] = [startOfDate(date || after), endOfDate(date || before)];
  return { ...options, after, before };
}

function buildPatchAndTransformFn(client, transformFn) {
  const patchFn = buildPatchFn(client);
  return async post => {
    post = await patchFn(post);
    return transformFn ? transformFn(post) : post;
  };
}

function buildPatchFn(client) {
  let indiciesPromise;
  return async post => {
    if (!indiciesPromise) {
      const userIndexPromise = client.users.index();
      const taxonomies = await client._helpers.findAssociatedTaxonomies('post');
      indiciesPromise = Promise.all([
        userIndexPromise,
        ...(taxonomies).map(({ rest_base }) => client.entities(rest_base).index()),
      ]);
    }
    const [userIndex, ...indicies] = await indiciesPromise;
    post = userIndex.patch(post, 'author');
    for (const index of indicies) {
      post = index.patch(post);
    }
    return post;
  };
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
