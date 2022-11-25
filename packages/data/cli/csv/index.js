import { TransformObjectStream } from '../../src/csv/index.js';
import { Parser } from 'csv-parse';
import { stream, splitObj } from '@miso.ai/server-commons';

function build(yargs) {
  return yargs
    .env('MD_CSV')
    .option('delimiter', {
      alias: 'd',
      describe: 'CSV parse options: delimiter',
    })
    .option('delimiter-tab', {
      alias: ['dt', 'tsv'],
      describe: 'CSV parse options: delimiter = TAB char',
      type: 'boolean',
    })
    .option('object', {
      alias: 'obj',
      describe: 'Output as objects',
      type: 'boolean',
    });
}

// https://csv.js.org/parse/options/escape/
const PARSE_OPTIONS = [
  'delimiter', 'delimiter-tab', 'encoding', 'escape'
];

async function run({ object, ...options }) {
  // TODO: more parse options
  const [ parseOptions, _ ] = splitObj(options, PARSE_OPTIONS);
  // because it's hard to pass in tab char in unix...
  if (parseOptions['delimiter-tab']) {
    delete parseOptions['delimiter-tab'];
    parseOptions.delimiter = '\t';
  }
  const transforms = object ? [new TransformObjectStream()] : [];
  await stream.pipelineToStdout(
    process.stdin,
    new Parser(parseOptions),
    ...transforms,
    stream.stringify(),
  );
}

export default {
  command: 'csv',
  description: `Parse CSV`,
  builder: build,
  handler: run,
};
