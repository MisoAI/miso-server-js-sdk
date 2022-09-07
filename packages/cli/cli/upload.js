import split2 from 'split2';
import { MisoClient, logger } from '../src/index.js';
import { stream } from '@miso.ai/server-commons';

function build(yargs) {
  return yargs
    .option('async', {
      alias: ['a'],
      describe: 'Asynchrnous mode',
    })
    .option('dry-run', {
      alias: ['dry'],
      describe: 'Dry run mode',
    })
    .option('records-per-request', {
      alias: ['rpr'],
      describe: 'How many records to send in a request',
    })
    .option('bytes-per-request', {
      alias: ['bpr'],
      describe: 'How many bytes to send in a request',
    })
    .option('bytes-per-second', {
      alias: ['bps'],
      describe: 'How many bytes to send per second',
    })
    .option('log-level', {
      describe: 'Log level',
    })
    .option('log-format', {
      describe: 'Log format',
    });
}

const run = type => async ({
  key,
  server,
  async,
  ['dry-run']: dryRun,
  ['records-per-request']: recordsPerRequest,
  ['bytes-per-request']: bytesPerRequest,
  ['bytes-per-second']: bytesPerSecond,
  ['log-level']: loglevel,
  ['log-format']: logFormat,
}) => {
  const client = new MisoClient({ key, server });
  const uploadStream = client.createUploadStream(type, {
    async, 
    dryRun,
    recordsPerRequest,
    bytesPerRequest,
    bytesPerSecond,
  });
  const logStream = new logger.LogStream({
    level: loglevel,
    format: logFormat,
  });

  await stream.pipelineToStdout(
    process.stdin,
    split2(),
    uploadStream,
    logStream,
  );
};

export default function(type) {
  return {
    command: 'upload',
    aliases: ['u'],
    description: `Upload ${type}`,
    builder: build,
    handler: run(type),
  };
}
