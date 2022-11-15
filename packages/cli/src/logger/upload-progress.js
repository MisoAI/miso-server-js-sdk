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

  _render({ config, state, uploadStats }) {
    // update config info
    config = this._config = (config || this._config);

    const { name = '(anonymous)', client = {} } = config || {};
    const { pending, successful, failed, time, bps } = state;
    const apiBps = uploadStats && uploadStats.api && uploadStats.api.bps;

    const configTable = formatTable([
      ['Job:', `${name}`],
      ['Server:', `${client.server || '(default)'}`],
      ['API Key:', `${client.keyMasked}`],
    ]);

    const statusTable = formatTable([
      ['Status:', `${this._renderStatusLine(state)}`],
      ['Service Speed:', `${isNaN(apiBps) ? '--' : formatSpeed(apiBps)}`],
      ['Client Speed:', `${formatSpeed(bps)}`],
    ]);

    const timeTable = formatTable([
      ['Total Time:', formatDuration(time.total), '  ', 'Paused:', formatDuration(time.paused)],
      ['Preparing:', formatDuration(time.waiting), '', 'Running:', formatDuration(time.running)],
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
${configTable}

${statusTable}

${timeTable}

${dataStatTable}
`;
  }

  _renderStatusLine({ status, time }) {
    if (status !== 'paused') {
      return status.toUpperCase();
    }
    const { currentTime, willResumeAt } = time;
    const willResumeIn = Math.max(0, willResumeAt - currentTime);
    return `${status.toUpperCase()} (resume in ${formatDuration(willResumeIn)})`;
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
