import { trimObj } from '../object.js';

export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
};

export function createStartEvent(channel, event = { type: 'start' }) {
  return stackEvent(channel, event, 'configs', channel.config);
}

export function createEndEvent(channel, event = { type: 'end' }) {
  return stackEvent(channel, event, 'results', channel.result);
}

export function stackEvent(channel, event = {}, field, info) {
  info = {
    ...info,
    channel: channel.name,
    timestamp: Date.now(),
  };
  return {
    ...event,
    [field]: [...(event[field] || []), info],
  };
}

export function normalizeEvent({
  type,
  form,
  channel,
  index,
  timestamp,
  ...rest
} = {}) {
  // re-order properties
  return trimObj({
    type,
    form,
    channel,
    index,
    ...rest,
    timestamp,
  });
}

export class ChannelOutput {

  constructor(channel) {
    this._channel = channel;
  }

  pass({ depth = 0, ...event }) {
    // don't put default timestamp
    this._channel._pushBuffer(normalizeEvent({
      ...event,
      depth: depth + 1,
    }));
  }

  write({ timestamp = Date.now(), ...event }) {
    this._channel._pushBuffer(normalizeEvent({
      ...event,
      channel: this._channel.name,
      depth: 0,
      timestamp,
    }));
  }

  log(level, message, data) {
    this.write({
      type: 'log',
      logLevel: level,
      message,
      ...data,
    });
  }

}
