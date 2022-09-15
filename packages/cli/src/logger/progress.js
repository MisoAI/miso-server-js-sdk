import { Writable } from 'stream';
import { createLogUpdate } from 'log-update';
import { log, padRight } from '@miso.ai/server-commons';

const { formatDuration, formatBytes } = log;

export default class ProgressLogStream extends Writable {

  constructor({
    out = process.stdout,
    err = process.stderr,
  } = {}) {
    super({
      objectMode: true,
    });
    this._update = createLogUpdate(out);
    this._err = err;
  }

  _write({ state, ...record }, _, next) {
    const { level } = record;
    if (log.isError(level)) {
      this._err.write(JSON.stringify(record) + '\n');
    }
    this._update(this._renderState(state));
    next();
  }

  _renderState({ elapsed, pending, successful, failed, apiBps, sentBps }) {

    // sum pending requests
    pending = sumMetrics(pending);

    const table = formatTable([
      ['', 'requests', 'records', 'bytes'],
      ['pending', pending.requests, pending.records, formatBytes(pending.bytes)],
      ['successful', successful.requests, successful.records, formatBytes(successful.bytes)],
      ['failed', failed.requests, failed.records, formatBytes(failed.bytes)],
    ]);

    return `
Time elapsed: ${formatDuration(elapsed)}
API Speed: ${formatSpeed(apiBps)}
Client Speed: ${formatSpeed(sentBps)}

${table}
`;
  }

}

function sumMetrics(requests) {
  return requests.reduce((acc, req) => {
    acc.requests ++;
    acc.records += req.records;
    acc.bytes += req.bytes;
    return acc;
  }, {
    requests: 0,
    records: 0,
    bytes: 0,
  });
}

function formatTable(rows, { columnPadding: columnSpacing = 2 } = {}) {
  const maxLens = [];
  for (const cells of rows) {
    for (let j = 0, len = cells.length; j < len; j++) {
      const len = `${cells[j]}`.length;
      if (!maxLens[j] || maxLens[j] < len) {
        maxLens[j] = len;
      }
    }
  }
  const colSpc = ' '.repeat(columnSpacing);
  let str = '';
  for (let i = 0, len = rows.length; i < len; i++) {
    if (i > 0) {
      str += '\n';
    }
    const cells = rows[i];
    for (let j = 0, len = cells.length; j < len; j++) {
      if (j > 0) {
        str += colSpc;
      }
      str += padRight(`${cells[j]}`, maxLens[j], ' ');
    }
  }
  return str;
}

function formatSpeed(value) {
  return isNaN(value) ? 'N/A' : `${formatBytes(value)}/s`;
}
