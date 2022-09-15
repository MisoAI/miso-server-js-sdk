import { Writable } from 'stream';
import { log } from '@miso.ai/server-commons';
import { FORMAT } from './constants.js';

export default class StandardLogStream extends Writable {

  constructor({
    level = log.INFO,
    format = FORMAT.JSON,
    out = process.stdout,
    err = process.stderr,
    ...options
  } = {}) {
    super({
      objectMode: true,
    });
    if (log.LEVELS.indexOf(level) < 0) {
      throw new Error(`Unrecognized log level: ${level}`);
    }
    this._level = level;
    this._debug = log.reachesThreshold(log.DEBUG, level);
    this._formatter = getFormatter(format);
    this._out = out;
    this._err = err;
  }

  _write(record, _, next) {
    const { level } = record;
    if (!log.reachesThreshold(level, this._level)) {
      next();
      return;
    }
    if (!this._debug) {
      delete record.state;
    }
    (log.isError(level) ? this._err : this._out).write(this._formatter(record) + '\n');
    next();
  }

}

function getFormatter(format) {
  switch (format) {
    case FORMAT.TEXT:
      return formatText;
    case FORMAT.JSON:
      return formatJson;
    default:
      throw new Error(`Unrecognized format: ${format}`);
  }
}

function formatJson(record) {
  return JSON.stringify(record);
}

function formatText({ level, timestamp, event, ...record }) {
  return `[${new Date(timestamp).toISOString()}][${level.toUpperCase()}] ${event}, ${JSON.stringify(record)}`;
}
