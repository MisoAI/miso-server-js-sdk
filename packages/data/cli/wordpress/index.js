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
    .demandOption(['site'], 'Site argument is required.')
    .command(posts)
    .command(categories)
    .command(users);
}

export default {
  command: 'wordpress',
  description: `Wordpress commands`,
  builder: build,
};
