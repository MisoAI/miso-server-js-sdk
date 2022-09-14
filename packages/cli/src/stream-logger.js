import { Transform } from 'stream';
import { log } from '@miso.ai/server-commons';

export const LOG_LEVELS = ['fatal', 'error', 'warning', 'info', 'debug'];

export class LogStream extends Transform {

  constructor({ level = log.INFO, format = 'json', ...options } = {}) {
    super({
      writableObjectMode: true,
      readableObjectMode: false,
    });
    if (log.LEVELS.indexOf(level) < 0) {
      throw new Error(`Unrecognized log level: ${level}`);
    }
    this._level = level;
    this._debug = log.reachesThreshold(log.DEBUG, level);
    this._formatter = getFormatter(format);
  }

  _transform(record, _, next) {
    if (!log.reachesThreshold(record.level, this._level)) {
      next();
      return;
    }
    if (!this._debug) {
      delete record.state;
    }
    this.push(this._formatter(record) + '\n');
    next();
  }

}

function getFormatter(format) {
  switch (format) {
    case 'text':
      return formatText;
    case 'json':
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
