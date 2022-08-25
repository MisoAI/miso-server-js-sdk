import profile from './profile.js';
import posts from './posts.js';
import categories from './categories.js';
import users from './users.js';

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
    //.demandOption(['site'], 'Site argument is required.')
    .command(profile)
    .command(posts)
    .command(categories)
    .command(users);
}

export default {
  command: 'wordpress',
  description: `Wordpress commands`,
  builder: build,
};
