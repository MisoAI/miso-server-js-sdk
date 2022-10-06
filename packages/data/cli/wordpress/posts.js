import {
  asArray,
  asMap,
  stream,
  startOfDate,
  endOfDate,
  parseDuration,
} from '@miso.ai/server-commons';
import {
  WordPressClient,
  transform as transformDefault,
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
  const transformer = await buildTransformer(client, patch, transform, legacy);
  await stream.pipelineToStdout(
    await client.entities('posts').stream({
      ...options,
      ...transformer.options,
    }),
    ...transformer.streams,
    stream.stringify(),
  );
}

async function runUpdate(client, update, { date, after, before, orderBy, order, patch, transform, legacy, ...options }) {
  const now = Date.now();
  update = parseDuration(update);
  const threshold = now - update;
  const posts = client.entities('posts');
  const transformer = await buildTransformer(client, patch, transform, legacy);
  await stream.pipelineToStdout(
    stream.concat(
      ...await Promise.all([
        // get recent published
        posts.stream({
          ...options,
          ...transformer.options,
          after: threshold,
        }),
        // get recent modified, excluding ones already fetched
        posts.stream({
          ...options,
          ...transformer.options,
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
    ...transformer.streams,
    stream.stringify(),
  );
}

function normalizeOptions({ date, after, before, ...options }) {
  [after, before] = [startOfDate(date || after), endOfDate(date || before)];
  return { ...options, after, before };
}

const AUTHOR_PROP_NAME = 'author';

// TODO: move these into client.posts
async function buildTransformer(client, patch, transform, legacy) {
  if (!patch && !transform) {
    return {
      streams: [],
      options: {},
    };
  }
  const taxonomies = await client._helpers.findAssociatedTaxonomies('post');
  const indicies = taxonomies.map(({ rest_base }) => client.entities(rest_base).index);

  // TODO: just make a stream class
  const patchFn = buildPatchFn(client, indicies);
  const transformFn = transform ? (legacy ? transformLegacy : transformDefault) : undefined;
  const patchAndTransformFn = async post => {
    post = await patchFn(post);
    return transformFn ? transformFn(post) : post;
  };
  const streams = [stream.transform(patchAndTransformFn, { objectMode: true })];

  const onFetch = records => {
    client.users.index.fetch(aggregateIds(records, AUTHOR_PROP_NAME));
    for (const index of indicies) {
      index.fetch(aggregateIds(records, index.name));
    }
  };
  const options = { /*onFetch*/ };

  return { streams, options };
}

function aggregateIds(records, propName) {
  return Array.from(records.reduce((idSet, record) => {
    for (const id of asArray(record[propName])) {
      idSet.add(id);
    }
    return idSet;
  }, new Set()));
}

/*
async function transformStreams(client, indicies, patch, transform, legacy) {
  if (!patch && !transform) {
    return [];
  }
  const fn = transform ? (legacy ? transformLegacy : transformDefault) : undefined;
  return [stream.transform(await buildPatchAndTransformFn(client, indicies, fn), { objectMode: true })];
}

async function buildPatchAndTransformFn(client, indicies, transformFn) {
  const patchFn = buildPatchFn(client, indicies);
  return async post => {
    post = await patchFn(post);
    return transformFn ? transformFn(post) : post;
  };
}
*/

function buildPatchFn(client, indicies) {
  return async post => {
    const patches = await Promise.all([
      client.users.index.patch(post, AUTHOR_PROP_NAME),
      ...indicies.map(index => index.patch(post)),
    ]);
    for (const patch of patches) {
      post = applyPatch(post, patch);
    }
    return post;
  };
}

function applyPatch(post, patch) {
  if (!patch) {
    return post;
  }
  return {
    ...post,
    _patch: {
      ...post._patch,
      ...patch,
    },
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
