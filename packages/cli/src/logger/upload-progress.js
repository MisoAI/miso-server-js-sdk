import { log, stream } from '@miso.ai/server-commons';

const { formatDuration, formatBytes, formatTable } = log;

export default class UploadProgressLogStream extends stream.LogUpdateStream {

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

  _render({ state, uploadStats }) {
    const { pending, successful, failed, time, bps } = state;
    const statusLine = this._renderStatusLine(state);
    const apiBps = uploadStats && uploadStats.api && uploadStats.api.bps;

    const timeTable = formatTable([
      ['Total Time', formatDuration(time.total)],
      ['Preparing', formatDuration(time.waiting)],
      ['Paused', formatDuration(time.paused)],
      ['Running', formatDuration(time.running)],
    ]);

    // sum pending requests
    const pendingSums = sumMetrics(pending);

    const dataStatTable = formatTable([
      ['', 'Requests', 'Records', 'Bytes'],
      ['Pending', pendingSums.requests, pendingSums.records, formatBytes(pendingSums.bytes)],
      ['Successful', successful.requests, successful.records, formatBytes(successful.bytes)],
      ['Failed', failed.requests, failed.records, formatBytes(failed.bytes)],
    ]);

    return `
Status: ${statusLine}
Service Speed: ${isNaN(apiBps) ? '--' : formatSpeed(apiBps)}
Client Speed: ${formatSpeed(bps)}

${timeTable}

${dataStatTable}
`;
  }

  _renderStatusLine({ status, time }) {
    if (status !== 'paused') {
      return status;
    }
    const { currentTime, willResumeAt } = time;
    const willResumeIn = Math.max(0, willResumeAt - currentTime);
    return `${status} (resume in ${formatDuration(willResumeIn)})`;
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
