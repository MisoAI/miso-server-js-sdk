import { loadConfig } from './config.js';
import { runJob } from '../src/index.js';

function build(yargs) {
  return yargs
    .positional('name', {
      describe: 'Job name',
    })
    .option('config', {
      alias: ['c'],
      describe: 'Config file',
    });
}

async function run({ name, config: configFile, ...options } = {}) {
  const config = await loadConfig(configFile);
  const job = findJob(config, name);
  if (!job) {
    throw new Error(`Job not found: ${name}`);
  }
  await runJob(job, options);
}

function findJob(config, name) {
  return config.jobs.find(job => job.name === name);
}

export default {
  command: 'run [name]',
  desc: 'Run a job',
  builder: build,
  handler: run,
};
