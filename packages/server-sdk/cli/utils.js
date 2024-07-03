export function buildForApi(yargs) {
  return yargs
    .option('key', {
      alias: ['k', 'api-key'],
      describe: 'API key',
    })
    .option('server', {
      alias: ['api-server'],
      describe: 'API server',
    })
    .option('param', {
      alias: ['v', 'var'],
      describe: 'Extra URL parameters',
      type: 'array',
      coerce: yargs.coerceToArray,
    })
    .option('debug', {
      describe: 'Set log level to debug',
      type: 'boolean',
    })
    .demandOption(['key'], 'API key is required.');
}
