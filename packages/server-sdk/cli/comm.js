import { spawn, spawnSync } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';

const build = type => yargs => {
  // only works for products
  if (type === 'products') {
    yargs = yargs
      .option('type', {
        alias: ['t'],
        describe: 'Only include record of given type',
        type: 'string',
      });
  }
  return yargs
    .option('1', {
      describe: 'Suppress column 1 (lines only in the input stream)',
      type: 'boolean',
    })
    .option('2', {
      describe: 'Suppress column 2 (lines only in the catalog)',
      type: 'boolean',
    })
    .option('3', {
      describe: 'Suppress column 3 (lines in both)',
      type: 'boolean',
    })
    .option('delete', {
      describe: 'Alias of -13: only show ids to delete (those absent in input and present in the catalog)',
      type: 'boolean',
    })
    .option('i', {
      alias: ['ignore-case'],
      describe: 'Case insensitive comparison',
      type: 'boolean',
    });
};

const run = type => async argv => {
  const {
    env,
    key,
    server,
    type: recordType,
    debug,
    i: ignoreCase,
  } = argv;

  const invalid = columnGroups(argv._).find(group => !COLUMN_GROUP.test(group));
  if (invalid !== undefined) {
    console.error(`Unknown argument: -${invalid}`);
    process.exit(1);
  }
  const suppressed = collectSuppressedColumns(argv);

  const client = new MisoClient({ env, key, server, debug });
  let ids;
  try {
    const options = recordType ? { type: recordType } : {};
    ids = await client.api[type].ids(options);
  } catch (err) {
    console.error(err);
    throw err;
  }

  // decide before we touch stdin, so both paths still see the whole input
  const commArgs = buildCommArgs(suppressed, ignoreCase);
  if (hasUnixTools(commArgs)) {
    await commWithUnixTools(ids, { commArgs, ignoreCase, debug });
  } else {
    await commInMemory(ids, { suppressed, ignoreCase, debug });
  }
};

// --- unix sort + comm ---

// let sort spill to disk instead of holding the whole input in the heap
const UNIX_ENV = { ...process.env, LC_ALL: 'C' };

function buildCommArgs(suppressed, ignoreCase) {
  const args = ['1', '2', '3'].filter(c => suppressed.has(c)).map(c => `-${c}`);
  if (ignoreCase) {
    args.push('-i');
  }
  return args;
}

/**
 * Probe the exact invocation we are about to make. GNU comm has no -i, so a
 * case insensitive run falls back to the in-memory implementation there.
 */
function hasUnixTools(commArgs) {
  if (process.platform === 'win32') {
    return false;
  }
  const probe = (command, args) => {
    const { error, status } = spawnSync(command, args, { stdio: 'ignore', env: UNIX_ENV });
    return !error && status === 0;
  };
  return probe('sort', ['/dev/null']) && probe('comm', [...commArgs, '/dev/null', '/dev/null']);
}

async function commWithUnixTools(ids, { commArgs, ignoreCase, debug }) {
  debug && console.error('[comm] using unix sort and comm');
  const sortArgs = ignoreCase ? ['-f'] : [];
  const dir = await mkdtemp(join(tmpdir(), 'miso-comm-'));
  try {
    const input = join(dir, 'input');
    const catalog = join(dir, 'catalog');
    // inputs are not assumed to be sorted
    await Promise.all([
      sortInto(input, sortArgs, process.stdin),
      sortInto(catalog, sortArgs, Readable.from(toLines(ids))),
    ]);
    await spawnAndWait('comm', [...commArgs, input, catalog], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function sortInto(path, args, source) {
  return spawnAndWait('sort', [...args, '-o', path], {
    stdio: ['pipe', 'inherit', 'inherit'],
  }, source);
}

function spawnAndWait(command, args, options, source) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: UNIX_ENV, ...options });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      // a downstream pipe closing early (e.g. | head) is not an error
      if (code === 0 || signal === 'SIGPIPE') {
        resolve();
      } else {
        reject(new Error(`${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
      }
    });
    if (source) {
      pipeline(source, child.stdin).catch(reject);
    }
  });
}

function* toLines(values, size = 1000) {
  for (let i = 0; i < values.length; i += size) {
    yield values.slice(i, i + size).join('\n') + '\n';
  }
}

// --- in-memory fallback ---

async function commInMemory(ids, { suppressed, ignoreCase, debug }) {
  debug && console.error('[comm] unix sort/comm unavailable, comparing in memory');
  const prefixes = buildPrefixes(suppressed);
  const compare = buildComparator(ignoreCase);
  const sortCompare = buildSortComparator(compare);

  // inputs are not assumed to be sorted
  const input = (await readLines(process.stdin)).sort(sortCompare);
  ids = [...ids].sort(sortCompare);

  await pipeline(
    Readable.from(comm(input, ids, { compare, prefixes })),
    new stream.OutputStream(),
  );
}

async function readLines(readable) {
  const lines = [];
  for await (const line of readable.pipe(split2())) {
    lines.push(line);
  }
  return lines;
}

/**
 * A column is indented by one tab per unsuppressed column before it.
 * A suppressed column gets a null prefix and is not printed at all.
 */
export function buildPrefixes(suppressed) {
  const prefixes = [];
  let shown = 0;
  for (let i = 0; i < 3; i++) {
    if (suppressed.has(`${i + 1}`)) {
      prefixes.push(null);
    } else {
      prefixes.push('\t'.repeat(shown++));
    }
  }
  return prefixes;
}

export function buildComparator(ignoreCase) {
  if (!ignoreCase) {
    return (a, b) => a < b ? -1 : a > b ? 1 : 0;
  }
  return (a, b) => {
    const ka = a.toLowerCase();
    const kb = b.toLowerCase();
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  };
}

/**
 * Like unix sort, fall back to a plain comparison when lines are equal by the
 * comm comparator, so that the output does not depend on the input order.
 */
export function buildSortComparator(compare) {
  return (a, b) => compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

export function* comm(a, b, { compare, prefixes }) {
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    let column, line;
    if (j >= b.length) {
      [column, line] = [0, a[i++]];
    } else if (i >= a.length) {
      [column, line] = [1, b[j++]];
    } else {
      const order = compare(a[i], b[j]);
      if (order < 0) {
        [column, line] = [0, a[i++]];
      } else if (order > 0) {
        [column, line] = [1, b[j++]];
      } else {
        [column, line] = [2, a[i++]];
        j++;
      }
    }
    const prefix = prefixes[column];
    if (prefix !== null) {
      yield prefix + line;
    }
  }
}

// --- option parsing ---

const COLUMN_GROUP = /^[123]+$/;

/**
 * yargs recognizes -1, -2 and -3 individually, but swallows grouped forms such
 * as -12 or -123 as negative numbers, so we pick them up from the positional
 * args instead.
 */
function columnGroups(args) {
  return args
    .filter(arg => typeof arg === 'number' && arg < 0)
    .map(arg => `${-arg}`);
}

export function collectSuppressedColumns(argv) {
  const suppressed = new Set();
  for (const column of ['1', '2', '3']) {
    if (argv[column]) {
      suppressed.add(column);
    }
  }
  if (argv.delete) {
    suppressed.add('1');
    suppressed.add('3');
  }
  for (const group of columnGroups(argv._)) {
    for (const digit of group) {
      suppressed.add(digit);
    }
  }
  return suppressed;
}

export default function(type) {
  return {
    command: 'comm',
    description: `Compare the input stream with the ids in the catalog, like unix comm`,
    builder: build(type),
    handler: run(type),
  };
}
