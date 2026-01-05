import EasyTransform from '../stream/easy-transform.js';
import { LOG_LEVEL } from './constants.js';
import { trimObj } from '../object.js';

function normalizeEvent({
  type,
  channel,
  index,
  timestamp,
  ...rest
} = {}) {
  return trimObj({
    type,
    channel,
    index,
    ...rest,
    timestamp,
  });
}

class Out {

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

export default class Channel extends EasyTransform {

  constructor({ name, transform, flush, ...options } = {}) {
    super({ ...options, objectMode: true });
    this._name = name || this.constructor.name;
    if (transform) {
      if (typeof transform !== 'function') {
        throw new Error('Transform must be a function');
      }
      this._runCustomTransform = transform.bind(this);
    }
    if (flush) {
      if (typeof flush !== 'function') {
        throw new Error('Flush must be a function');
      }
      this._runCustomFlush = flush.bind(this);
    }
    this._upstream = {};
    this.out = new Out(this);
  }

  get name() {
    return this._name;
  }



  // customization //
  get config() {
    return {};
  }

  get pulse() {
    return {};
  }

  get results() {
    return {};
  }

  async _runCustomTransform(event) {
    this.out.pass(event);
  }

  async _runCustomFlush() {}

  async _runFlush() {
    await this._runCustomFlush();
    // clear heartbeat if necessary
    // TODO
    if (!this._upstream.start) {
      // not seen start event from upstream, so the upstream is empty
      throw new Error('Start event not received from upstream');
    }
    if (!this._upstream.end) {
      // not seen end event from upstream, warn
      this.out.log(LOG_LEVEL.WARNING, 'End event not received from upstream');
    }
    // write my own end event
    this.out.write(this._createEndEvent(this._upstream.end));

    await super._runFlush();
  }

  _readUpstreamStartEvent(event) {
    // take the heartbeat setting
    // TODO
  }



  // internal //
  async _runTransform(event) {
    // expect the start event from upstream
    if (!this._upstream.start) {
      if (event.type !== 'start') {
        throw new Error(`The first event received from upstream must be a start event: ${JSON.stringify(event)}`);
      }
      this._upstream.start = event;
      this.out.write(this._createStartEvent(event));
      this._readUpstreamStartEvent(event);
      return;
    }
    switch (event.type) {
      case 'start':
        throw new Error(`Received a second start event from upstream: ${JSON.stringify(event)}`);
      case 'end':
        if (this._upstream.end) {
          // seen end event from upstream, warn
          this.out.log(LOG_LEVEL.WARNING, `Received a second end event from upstream: ${JSON.stringify(event)}`);
        } else {
          this._upstream.end = event;
        }
        break;
      default:
        await this._runCustomTransform(event);
    }
  }

  _writePulseEvent() {
    try {
      this.out.write({
        type: 'pulse',
        ...this.pulse,
      });
    } catch (error) {
      this.out.log(LOG_LEVEL.ERROR, `Failed to write pulse event: ${error.message}`, { error });
    }
  }

  _createStartEvent(event) {
    return this._stackEvent(event, 'configs', this.config);
  }

  _createEndEvent(event) {
    return this._stackEvent(event, 'results', this.results);
  }

  _stackEvent(event = {}, field, info) {
    info = {
      ...info,
      channel: this.name,
      timestamp: Date.now(),
    };
    return {
      ...event,
      [field]: [...(event[field] || []), info],
    };
  }

}
