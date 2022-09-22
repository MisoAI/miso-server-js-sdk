import profile from './profile.js';
import posts from './posts.js';
import entities from './entities.js';

// TODO: support standalone transform CLI

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
    .command(posts)
    .command(entities);
}

export default {
  command: 'wordpress',
  description: `Wordpress commands`,
  builder: build,
};
