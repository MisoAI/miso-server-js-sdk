import { Transform } from 'stream';
import { stream, parseDuration } from '@miso.ai/server-commons';
import { WordPressClient } from '../src/index.js';
import { normalizeOptions, normalizeTransform, parseDate } from './utils.js';

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
    })
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
      alias: 'include',
      describe: 'Specify post ids'
    })
    .option('fields', {
      describe: 'Specify which record fields are retrieved',
      type: 'array',
      coerce: yargs.coerceToArray,
    })
    .option('resolve', {
      alias: 'r',
      describe: 'Attach resolved entities (author, catagories) linked with the subjects',
      type: 'boolean',
    })
    .option('transform', {
      alias: 't',
      describe: 'Apply transform function to the entities',
    });
    /*
    .option('limit', {
      alias: 'n',
      describe: 'Limit the amount of records',
      type: 'number',
    })
    */
}

function build(yargs) {
  return buildForEntities(yargs)
    .positional('name', {
      describe: 'Resource type',
      type: 'string',
    });
}

async function run({ subcmd, count, terms, update, name, ...options }) {
  options = normalizeOptions(options);
  const client = new WordPressClient(options);
  switch (subcmd) {
    case 'ids':
      await runIds(client, name, { update, ...options });
      return;
    case 'count':
      await runCount(client, name, options);
      return;
  }
  if (count) {
    await runCount(client, name, options);
  } else if (terms) {
    await runTerms(client, name, options);
  } else if (update) {
    await runUpdate(client, name, update, options);
  } else {
    await runGet(client, name, options);
  }
}

export async function runCount(client, name, options) {
  console.log(await client.entities(name).count(options));
}

export async function runTerms(client, name, options) {
  const terms = await client.entities(name).terms(options);
  for (const term of terms) {
    console.log(JSON.stringify(term));
  }
}

export async function runGet(client, name, { transform, ...options }) {
  await stream.pipelineToStdout(
    await client.entities(name).stream({
      ...options,
      transform: await normalizeTransform(transform),
    }),
    stream.stringify(),
  );
}

export async function runIds(client, name, { update, transform, resolve, fields, ...options }) {
  if (update) {
    await stream.pipeline(
      await buildUpdateStream(client, name, update, { ...options, fields: ['id', 'modified_gmt'] }),
      new Transform({
        objectMode: true,
        transform({ id }, _, callback) {
          callback(null, id);
        },
      }),
      new stream.OutputStream(),
    );
  } else {
    await stream.pipeline(
      await client.entities(name).ids(options),
      new stream.OutputStream(),
    );
  }
}

export async function runUpdate(client, name, update, options) {
  await stream.pipeline(
    await buildUpdateStream(client, name, update, options),
    new stream.OutputStream(),
  );
}

async function buildUpdateStream(client, name, update, {
  date, after, before, orderBy, order, // strip off date filters and order criteria
  transform,
  ...options
}) {
  // TODO: move the logic into client itself
  transform = await normalizeTransform(transform);
  const now = Date.now();
  update = parseDuration(update);
  const threshold = now - update;
  const entities = client.entities(name);
  return stream.concat(
    ...await Promise.all([
      // get recent published
      entities.stream({
        ...options,
        transform,
        after: threshold,
      }),
      // get recent modified, excluding ones already fetched
      entities.stream({
        ...options,
        transform,
        orderBy: 'modified',
        before: threshold,
        pageSize: 20,
        strategy: {
          highWatermark: 100,
          eagerLoad: true,
          terminate: entity => parseDate(entity.modified_gmt) < threshold,
        },
      })
    ])
  );
}

export default {
  command: ['$0 <name> [subcmd]'],
  desc: 'List entities from WordPress REST API',
  builder: build,
  handler: run,
};
