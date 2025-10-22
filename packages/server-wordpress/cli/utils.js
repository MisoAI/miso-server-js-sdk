import { startOfDate, endOfDate, yargs as _yargs } from '@miso.ai/server-commons';

export function normalizeOptions({ date, after, before, ids, include, ...options }) {
  // TODO: should be able to turn this off, as it's covered by helper
  [after, before] = [startOfDate(date || after), endOfDate(date || before)];
  // TODO: rely on yargs to coerce to array
  ids = ids ? `${ids}`.split(',').map(s => s.trim()) : ids;
  return { ...options, after, before, ids };
}

/*
export function parseDate(value) {
  return Date.parse(`${value}Z`);
}
*/

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
      describe: 'Specify post ids',
    })
    .option('fields', {
      describe: 'Specify which record fields are retrieved',
      type: 'array',
      coerce: _yargs.coerceToArray,
    })
    .option('params', {
      describe: 'Specify additional query parameters in the form of key=value',
      type: 'array',
      coerce: _yargs.coerceToArray,
    })
    .option('resolve', {
      alias: 'r',
      describe: 'Attach resolved entities (author, catagories) linked with the subjects',
      type: 'boolean',
    })
    .option('transform', {
      alias: 't',
      describe: 'Apply transform function to the entities',
    })
    .option('limit', {
      alias: 'n',
      describe: 'Limit the amount of records',
      type: 'number',
    });
}
