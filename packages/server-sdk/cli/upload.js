import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { log, stream } from '@miso.ai/server-commons';
import { MisoClient, logger, normalize } from '../src/index.js';
import { buildForWrite } from './utils.js';

function build(yargs) {
  return buildForWrite(yargs)
    .option('dry-run', {
      alias: ['dry'],
      describe: 'Dry run mode',
      type: 'boolean',
      default: false,
    })
    .option('lenient', {
      describe: 'Accept some lenient record schema',
      type: 'boolean',
    })
    .option('progress', {
      alias: ['p'],
      describe: 'Set log format progress',
      type: 'boolean',
    })
    .option('stream-name', {
      alias: ['name'],
      describe: 'Stream name that shows up in log messages',
    })
    .option('log-level', {
      describe: 'Log level',
    })
    .option('log-format', {
      describe: 'Log format',
    });
}

const run = type => async ({
  env,
  key,
  server,
  channel,
  ...options
}) => {
  const { debug } = options;
  const client = new MisoClient({ env, key, server, debug });

  if (channel) {
    await runChannel(client, type, options);
  } else {
    await runStream(client, type, options);
  }
};

async function runChannel(client, type, {
  param: params,
  ['dry-run']: dryRun,
  ['requests-per-second']: requestsPerSecond,
  ['bytes-per-second']: bytesPerSecond,
  ['records-per-request']: recordsPerRequest,
  ['bytes-per-request']: bytesPerRequest,
  debug,
}) {
  const uploadChannel = client.api[type].uploadChannel({
    dryRun,
    params,
    requestsPerSecond,
    bytesPerSecond,
    recordsPerRequest,
    bytesPerRequest,
    debug, // TODO: review this
  });

  await pipeline(
    process.stdin,
    split2(JSON.parse),
    uploadChannel,
    new stream.OutputStream({ objectMode: true }),
  );
}

async function runStream(client, type, {
  param: params,
  ['dry-run']: dryRun,
  lenient,
  ['requests-per-second']: requestsPerSecond,
  ['records-per-request']: recordsPerRequest,
  ['bytes-per-request']: bytesPerRequest,
  ['bytes-per-second']: bytesPerSecond,
  progress,
  debug,
  ['experiment-id']: experimentId,
  ['stream-name']: name,
  ['log-level']: loglevel,
  ['log-format']: logFormat,
}) {
  loglevel = (debug || progress) ? log.DEBUG : loglevel;
  logFormat = progress ? logger.FORMAT.PROGRESS : logFormat;

  const uploadStreamObjectMode = lenient;

  const uploadStream = client.api[type].uploadStream({
    objectMode: uploadStreamObjectMode,
    name,
    dryRun,
    params,
    heartbeatInterval: logFormat === logger.FORMAT.PROGRESS ? 250 : false,
    requestsPerSecond,
    recordsPerRequest,
    bytesPerRequest,
    bytesPerSecond,
    experimentId,
    extra: {
      lenient,
    },
  });

  const logStream = logger.createLogStream({
    api: 'upload',
    type,
    level: loglevel,
    format: logFormat,
  });

  // standard: stdin -> split2 -> upload -> log
  // lenient: stdin -> split2 -> parse -> normalize -> upload -> log
  // notice that the output of split2 are strings, while input/output of normalize are objects

  await pipeline(
    process.stdin,
    split2(),
    ...(lenient ? [
      stream.parse(),
      new normalize.Stream(type),
    ] : []),
    uploadStream,
    logStream,
  );
}

export default function(type) {
  return {
    command: 'upload',
    aliases: ['u'],
    description: `Upload ${type}`,
    builder: build,
    handler: run(type),
  };
}
