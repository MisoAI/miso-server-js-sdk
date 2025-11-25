import { yargs as _yargs } from '@miso.ai/server-commons';

export function buildForApi(yargs) {
  return yargs
    .option('key', {
      alias: ['k', 'api-key'],
      describe: 'API key',
    })
    .option('env', {
      describe: 'Environment',
      type: 'string',
    })
    .option('server', {
      alias: ['api-server'],
      describe: 'API server',
    })
    .option('param', {
      alias: ['v', 'var'],
      describe: 'Extra URL parameters',
      type: 'string',
      coerce: _yargs.coerceToArray,
    })
    .option('debug', {
      describe: 'Set log level to debug',
      type: 'boolean',
    });
}

export function buildForSearch(yargs) {
  return yargs
    .option('fq', {
      type: 'string',
      describe: 'Filter query',
    })
    .option('fl', {
      type: 'string',
      coerce: _yargs.coerceToArray,
      describe: 'Fields to return',
    })
    .option('rows', {
      alias: ['n'],
      type: 'number',
      describe: 'Number of rows to return',
    })
    .option('start', {
      alias: ['s'],
      type: 'number',
      describe: 'Start index',
    });
}

export function formatError(err) {
  const { response } = err;
  if (response) {
    const { data, status } = response;
    return { errors: true, status, ...data };
  }
  return { errors: true, message: err.message };
}
