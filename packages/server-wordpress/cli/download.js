import { createWriteStream } from 'fs';
import { access, mkdir } from 'fs/promises';
import { createGzip } from 'zlib';
import { startOfDate, endOfDate, stream } from '@miso.ai/server-commons';
import { WordPressClient } from '../src/index.js';
import { buildForEntities } from './utils.js';

function build(yargs) {
  return buildForEntities(yargs);
}

async function run({
  destination = './data',
  batchSize = 30000,
  ...options
} = {}) {
  const client = new WordPressClient(options);

  const  [firstPostYear, lastPostYear] = await client.posts.yearRange();

  // divide into batches
  const batches = [];
  let endYear, sum = 0;
  for (let year = lastPostYear; year >= firstPostYear; year--) {
    if (endYear === undefined) {
      endYear = year;
    }
    const after = startOfDate(year);
    const before = endOfDate(year);
    const count = await client.posts.count({ ...options, after, before });
    sum += count;
    if (sum >= batchSize) {
      batches.push({ start: year, end: endYear, records: sum });
      endYear = undefined;
      sum = 0;
    }
  }
  if (sum > 0) {
    batches.push({ start: firstPostYear, end: endYear, records: sum });
  }
  const batchCount = batches.length;
  if (batchCount === 0) {
    console.log('No posts found.');
    return;
  }
  // merge last two batches if last batch is too small
  if (batches[batchCount - 1].records < batchSize * 0.2) {
    const last = batches.pop();
    batches[batchCount - 2].end = last.end;
    batches[batchCount - 2].records += last.records;
  }
  console.log(`Divide into ${batchCount} batches:`);
  for (const { start, end, records } of batches) {
    console.log(`- ${start} -> ${end} (${records} records)`);
  }

  // mkdir -p
  try {
    await access(destination);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    await mkdir(destination, { recursive: true });
    console.log(`Created directory ${destination}`);
  }

  // download
  let index = 0;
  for (const batch of batches) {
    const { start, end, records } = batch;
    const after = startOfDate(start);
    const before = endOfDate(end);
    const filename = `${options.transform ? 'miso' : 'wp'}-posts.${start}-${end}.jsonl.gz`;

    console.log(`[${index + 1} / ${batchCount}] Downloading ${filename}`);

    const startTime = Date.now();
    const sourceStream = await client.posts.stream({ ...options, after, before });

    await stream.pipeline(
      sourceStream,
      stream.stringify(),
      createGzip(),
      createWriteStream(`${destination}/${filename}`),
    );

    const elapsed = Date.now() - startTime;
    console.log(`[${index + 1} / ${batchCount}] Downloaded ${filename} (${records} records in ${formatDuration(elapsed)})`);
    index++;
  }

  console.log('Done.');
}

function formatDuration(duration) {
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h${minutes % 60}m${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export default {
  command: 'download',
  aliases: ['down'],
  desc: 'Download all posts and save as files.',
  builder: build,
  handler: run,
};
