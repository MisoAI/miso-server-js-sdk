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

export function validateEvent(event) {
  switch (event.type) {
    case 'data':
      if (!event.id) {
        throw new Error('Id is required for data events');
      }
      if (!event.form) {
        throw new Error('Form is required for data events');
      }
      break;
  }
}

export function generateDefaultSinkResponse({ records, data }) {
  // default implementation: assume all successful
  return {
    writes: 1,
    successful: {
      records,
      data,
    },
    failed: {
      records: 0,
      data: [],
    },
  };
}

export class ChannelOutput {

  constructor(channel) {
    this._channel = channel;
  }

  pass({ depth = 0, ...rest }) {
    // don't put default timestamp
    const event = {
      ...rest,
      depth: depth + 1,
    };
    this._channel._pushBuffer(normalizeEvent(event));
  }

  write({ timestamp = Date.now(), ...rest }) {
    const event = {
      ...rest,
      channel: this._channel.name,
      depth: 0,
      timestamp,
    };
    validateEvent(event);
    this._channel._pushBuffer(normalizeEvent(event));
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
