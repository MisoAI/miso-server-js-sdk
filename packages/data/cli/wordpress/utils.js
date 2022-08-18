export function addSiteOption(yargs) {
  return yargs
    .option('site', {
      alias: 's',
      describe: 'the WordPress site',
    })
    .demandOption(['site'], 'Site argument is required.');
}
