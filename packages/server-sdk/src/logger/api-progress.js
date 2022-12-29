import { log, stream } from '@miso.ai/server-commons';

const { formatDuration, formatBytes, formatTable } = log;

export default class ApiProgressLogStream extends stream.LogUpdateStream {

  _renderError({ state: _, ...record }) {
    return super._renderError(record);
  }

  _render(args) {
    args = this._normalizeInput(args);
    return this._sections(args)
      .map(s => `\n${s}\n`)
      .join('');
  }

  _normalizeInput({ config, ...args } = {}) {
    return {
      config: (this._config = (config || this._config)),
      ...args,
    };
  }

  _sections({ config, state }) {
    return [
      this._configTableCached(config),
      this._statusTable(state),
      this._timeStatsTable(state),
      this._dataStatsTable(state),
    ];
  }

  _configTableCached(config) {
    return this._configTableString || (this._configTableString = this._configTable(config));
  }

  _configTable(config = {}) {
    const { name, id, client = {} } = config;
    const rows = [];
    const props = this._configProps(config);
    if (props.length) {
      rows.push(['Config:', props.join(', ')]);
    }
    return formatTable([
      ['Job:', `${name || id}`],
      ...rows,
      ['Server:', `${client.server || '(default)'}`],
      ['API Key:', `${client.keyMasked}`],
    ]);
  }

  _configProps(config = {}) {
    const { sink = {}, extra = {} } = config;
    const { dryRun, async, params } = sink;
    const props = [];
    if (dryRun) {
      props.push('dry-run');
    }
    if (async) {
      props.push('async');
    }
    if (params && Object.keys(params).length) {
      props.push(`params = ${JSON.stringify(params)}`);
    }
    return props;
  }

  _statusTable(state) {
    const { bps, stats } = state;
    const serviceBps = stats && stats.service && stats.service.bps;
    return formatTable([
      ['Status:', `${this._statusLine(state)}`],
      ['Service Speed:', this._formatBps(serviceBps)],
      ['Client Speed:', this._formatBps(bps)],
    ]);
  }

  _statusLine({ status, time }) {
    switch (status) {
      case 'paused':
        const { currentTime, willResumeAt } = time;
        const willResumeIn = Math.max(0, willResumeAt - currentTime);
        return `${status.toUpperCase()} (resume in ${formatDuration(willResumeIn)})`;
      default:
        return status.toUpperCase();
    }
  }

  _timeStatsTable({ time }) {
    const { total, waiting, running, paused } = time;
    return formatTable([
      ['Total Time', 'Preparing', 'Running', 'Paused'],
      [formatDuration(total), formatDuration(waiting), formatDuration(running), formatDuration(paused)],
    ]);
  }

  _dataStatsTable({ pending, successful, failed }) {
    const pendingSums = this._sumMetrics(pending);

    return formatTable([
      ['', 'Requests', 'Records', 'Bytes'],
      ['Pending', pendingSums.requests, pendingSums.records, formatBytes(pendingSums.bytes)],
      ['Successful', successful.requests, successful.records, formatBytes(successful.bytes)],
      ['Failed', failed.requests, failed.records, formatBytes(failed.bytes)],
    ]);
  }

  // helper //
  _sumMetrics(requests) {
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

  // TODO: move to log utils
  _formatBps(value) {
    return isNaN(value) ? '--' : `${formatBytes(value)}/s`;
  }
  
  _formatRps(value) {
    return isNaN(value) ? '--' : `${value} records/s`;
  }
  
}
