import { log, stream } from '@miso.ai/server-commons';

const { formatDuration, formatBytes, formatTable } = log;

export default class LegacyProgressLogStream extends stream.LogUpdateStream {

  constructor({
    out = process.stdout,
    err = process.stderr,
  } = {}) {
    super({
      out,
      err,
    });
  }

  _renderError({ state: _, ...record }) {
    return super._renderError(record);
  }

  _render({ state }) {
    const { elapsed, pending, successful, failed, apiBps, sentBps } = state;

    // sum pending requests
    const pendingSums = sumMetrics(pending);

    const table = formatTable([
      ['', 'Requests', 'Records', 'Bytes', 'Server Time', 'Latency'],
      ['Pending', pendingSums.requests, pendingSums.records, formatBytes(pendingSums.bytes), '--', '--'],
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
