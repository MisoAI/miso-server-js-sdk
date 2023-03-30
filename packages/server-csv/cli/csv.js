import { Parser } from 'csv-parse';
import { splitObj, stream } from '@miso.ai/server-commons';
import { CsvTransformObjectStream } from '../src/index.js';

function build(yargs) {
  return yargs
    .env('MISO_CSV')
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
  'delimiter', 'delimiter-tab', 'encoding', 'escape', 'relax_quotes'
];

async function run({ object, ...options }) {
  // TODO: more parse options
  const [ parseOptions, _ ] = splitObj(options, PARSE_OPTIONS);
  // because it's very tricky to pass a tab char in unix...
  if (parseOptions['delimiter-tab']) {
    delete parseOptions['delimiter-tab'];
    parseOptions.delimiter = '\t';
  }
  parseOptions.relax_quotes = true;
  const transforms = object ? [new CsvTransformObjectStream()] : [];
  await stream.pipelineToStdout(
    process.stdin,
    new Parser(parseOptions),
    ...transforms,
    stream.stringify(),
  );
}

export default {
  description: 'Interpret lines as CSV records',
  builder: build,
  handler: run,
};
