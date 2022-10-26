import profile from './profile.js';
import taxonomies from './taxonomies.js';
import entities from './entities.js';

function build(yargs) {
  return yargs
    .env('MD_WORDPRESS')
    .option('site', {
      alias: 's',
      describe: 'the WordPress site',
    })
    .option('profile', {
      alias: 'p',
      describe: 'Site profile file location',
    })
    .option('debug', {
      type: 'boolean',
      default: false,
    })
    .hide('debug')
    .command(profile)
    .command(taxonomies)
    .command(entities);
}

export default {
  command: 'wordpress',
  description: `Wordpress commands`,
  builder: build,
};
