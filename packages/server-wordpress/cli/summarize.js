import { startOfDate, endOfDate, getYear } from '@miso.ai/server-commons';
import { WordPressClient } from '../src/index.js';

function build(yargs) {
  return yargs;
}

async function run({ ...options } = {}) {
  const client = new WordPressClient(options);
  const [total, [firstPostDate, lastPostDate]] = await Promise.all([
    client.posts.count(options),
    client.posts.dateRange(),
  ]);
  const totalStrLength = `${total}`.length;
  console.log();
  console.log(`Total posts: ${total}`);
  console.log(`First post at: ${firstPostDate}`);
  console.log(`Last post at: ${lastPostDate}`);

  // drill down by year
  console.log();
  const bar = `| ---- | ${'-'.repeat(totalStrLength)} |`;
  console.log(bar);
  console.log(`| Year | ${'Posts'.padStart(totalStrLength)} |`);
  console.log(bar);
  for (let year = getYear(firstPostDate), lastYear = getYear(lastPostDate); year <= lastYear; year++) {
    const after = startOfDate(year);
    const before = endOfDate(year);
    const count = await client.posts.count({ ...options, after, before });
    console.log(`| ${year} | ${`${count}`.padStart(totalStrLength)} |`);
  }
  console.log(bar);
}

function printTable(arr) {
  arr = arr.map((row) => row.map(str));
  const colWidths = arr[0].map((_, i) => Math.max(...arr.map((row) => (row[i] || '').length)));
  for (const row of arr) {
    console.log(row.map((v, i) => rightPad(v, colWidths[i])).join(' '));
  }
}

function str(value) {
  return value === undefined ? '--' : `${value}`;
}

function rightPad(str = '', length) {
  return str.padEnd(length);
}

export default {
  command: 'summarize',
  aliases: ['sum'],
  desc: 'Print out a summary of the WordPress site',
  builder: build,
  handler: run,
};
