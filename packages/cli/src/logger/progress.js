import { Writable } from 'stream';
import { createLogUpdate } from 'log-update';
import { log } from '@miso.ai/server-commons';

const { formatDuration, formatBytes, formatTable } = log;

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
      //this._update.done();
      this._err.write(JSON.stringify(record) + '\n');
    }
    this._update(this._renderState(state));
    next();
  }

  _renderState({ elapsed, pending, successful, failed, apiBps, sentBps }) {

    // sum pending requests
    pending = sumMetrics(pending);

    const table = formatTable([
      ['', 'Requests', 'Records', 'Bytes', 'Server Time', 'Latency'],
      ['Pending', pending.requests, pending.records, formatBytes(pending.bytes), '--', '--'],
      ['Successful', successful.requests, successful.records, formatBytes(successful.bytes), formatDuration(successful.took), formatDuration(successful.latency)],
      ['Failed', failed.requests, failed.records, formatBytes(failed.bytes), formatDuration(failed.took), formatDuration(failed.latency)],
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

function formatSpeed(value) {
  return isNaN(value) ? 'N/A' : `${formatBytes(value)}/s`;
}
