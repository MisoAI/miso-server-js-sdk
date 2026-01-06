import Channel from './channel.js';
import TimeTracker from './time.js';
import WriteChannelBuffer from './buffer.js';
import WriteChannelSinkGate from './sink-gate.js';
import WriteChannelSink from './sink.js';

function normalizeBuffer(buffer) {
  if (typeof buffer !== 'object') {
    throw new Error('A buffer instance or buffer options is required.');
  }
  if (typeof buffer.push !== 'function') {
    buffer = new WriteChannelBuffer(buffer);
  }
  return buffer;
}

function normalizeSink(sink) {
  if (typeof sink !== 'object') {
    throw new Error('A sink instance or sink options is required.');
  }
  if (typeof sink._write !== 'function') {
    sink = new WriteChannelSink(sink);
  }
  return sink;
}

function normalizeSinkGate(sinkGate) {
  if (!sinkGate) {
    return undefined; // can be undefined
  }
  if (typeof sinkGate.blockedTime !== 'function') {
    sinkGate = new WriteChannelSinkGate(sinkGate);
  }
  return sinkGate;
}

export default class WriteChannel extends Channel {

  constructor({ buffer, sink, sinkGate, ...options } = {}) {
    super(options);
    this._payloadBuffer = normalizeBuffer(buffer);
    this._sink = normalizeSink(sink);
    this._sinkGate = normalizeSinkGate(sinkGate);
    this._time = new TimeTracker();
    this._index = 0;
  }

  get pulse() {
    return {
      ...super.pulse,
      status: this._events.end ? 'finished' : this._time.firstWriteAt === undefined ? 'waiting' : this._time.paused ? 'paused' : 'running',
      time: this._time.snapshot(Date.now()),
      write: this._sink.state,
    };
  }

  async writeData(event) {
    // TODO: dedupe
    await this._dispatchAll(this._payloadBuffer.push(event));
  }

  async _runFlush() {
    await this._dispatchAll(this._payloadBuffer.flush());
    await this._sink.finished;

    // end event is here
    await super._runFlush();

    this._sink.destroy();
    this._payloadBuffer.destroy();
  }

  async _pauseIfNecessary() {
    if (!this._sinkGate) {
      return;
    }
    const pauseTime = this._sinkGate.blockedTime(this._sink.state);
    await this._time.pause(pauseTime);
  }

  async _dispatchAll(requests) {
    for (const request of requests) {
      await this._pauseIfNecessary();
      this._dispatch(request); // don't wait
    }
  }

  async _dispatch(request) {
    const index = this._index++;
    if (this._time.firstWriteAt === undefined) {
      this._time.setFirstWrite();
    }
    this.out.write({
      ...request,
      type: 'request',
      index,
    });
    const response = await this._sink.write(request);
    this._time.addWrite(response.timestamp - request.timestamp);
    this.out.write({
      ...response,
      type: 'response',
      index,
    });

    // TODO: dedupe
  }

}
