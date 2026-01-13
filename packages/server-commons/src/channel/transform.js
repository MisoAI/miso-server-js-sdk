import Channel from './channel.js';
import { writeChannelInfo } from './events.js';
import { trimObj } from '../object.js';

export default class TransformChannel extends Channel {

  constructor({
    transform,
    name = 'transform',
    ...options
  }) {
    super({
      name,
      ...options,
    });
    if (transform) {
      if (typeof transform !== 'function') {
        throw new Error(`Transform must be a function.`);
      }
      this._transformData = transform;
    }
  }

  async _transformData(event) {
    throw new Error('Not implemented');
  }

  async _runCustomTransform(event) {
    switch (event.type) {
      case 'data':
        await this._runData(event);
        return;
    }
    await super._runCustomTransform(event);
  }

  async _runData(event) {
    let transformed;
    try {
      transformed = this._transformData(event);
    } catch (error) {
      // write error to source event and pass through
      const { type, message } = error;
      transformed = {
        errors: writeChannelInfo(this, [{ type, message }]),
      };
    }
    this._validateEvent(transformed);
    this.out.write(this._createDataEvent(event, transformed));
  }

  _createDataEvent({ sources = [], logs, warnings, errors, ...event } = {}, transformed) {
    sources = [...sources, event];
    logs = mergeInfoArray(logs, writeChannelInfo(this, transformed.logs));
    warnings = mergeInfoArray(warnings, writeChannelInfo(this, transformed.warnings));
    errors = mergeInfoArray(errors, writeChannelInfo(this, transformed.errors));
    return trimObj({
      ...transformed,
      type: 'data',
      sources,
      logs,
      warnings,
      errors,
    });
  }

  _validateEvent(event) {
    if (typeof event !== 'object') {
      throw new Error('the _transformData method must return an event');
    }
    if (event.payload === undefined && !event.ignored) {
      throw new Error('Event payload is undefined');
    }
  }

}

function mergeInfoArray(a = [], b = []) {
  if (a.length === 0 && b.length === 0) {
    return undefined;
  }
  return [...a, ...b];
}
