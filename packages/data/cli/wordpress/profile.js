import { fileExists } from '@miso.ai/server-commons';
import { WordPressClient } from '../../src/wordpress/index.js';

function build(yargs) {
  return yargs
    .option('generate', {
      alias: 'g',
      describe: 'Generate profile',
      type: 'boolean',
    });
}

async function run({ generate, ...options }) {
  if (generate) {
    await runGenerate(options);
  } else {
    await runView(options);
  }
}

async function runGenerate(options) {
  // it's OK if profile file doesn't exist in generate mode
  // but we need to leave it out from the options
  const { profile } = options;
  if (profile && !await fileExists(profile)) {
    delete options.profile;
  }
  const client = new WordPressClient(options);
  await client.generateProfile();
  await client.saveProfile(profile);
}

async function runView(options) {
  const client = new WordPressClient(options);
  console.log(JSON.stringify(client.profile, undefined, 2));
}

export default {
  command: 'profile',
  desc: 'WordPress site profile management',
  builder: build,
  handler: run,
};
