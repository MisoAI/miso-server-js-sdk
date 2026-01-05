// TODO: these parameters are Miso-specific
function normalizeOptions({
  writesPerSecond = 10,
  recordsPerSecord = 100000,
  bytesPerSecond = 100 * 1024 * 1024,
  ...options
} = {}) {
  return {
    writesPerSecond,
    recordsPerSecord,
    bytesPerSecond,
    ...options,
  };
}

export default class WriteChannelSinkGate {

  constructor(options) {
    this._options = normalizeOptions(options);
  }

  blockedTime(sinkState, now = Date.now()) {
    const { start, started } = sinkState;
    const elapsed = now - start;
    const targetBps = this._targetBps(now);
    const targetRps = this._targetRps(now);
    const targetWps = this._targetWps(now);

    const shallElapsed = Math.max(started.records / targetRps, started.bytes / targetBps, started.writes / targetWps) * 1000;

    const blockedTime = shallElapsed - elapsed;
    if (blockedTime <= 1000) {
      return 0;
    }
    // TODO: review this
    return Math.ceil(blockedTime);
  }

  _targetBps(timestamp) {
    return this._options.bytesPerSecond;
  }

  _targetRps(timestamp) {
    return this._options.recordsPerSecord;
  }

  _targetWps(timestamp) {
    return this._options.writesPerSecond;
  }

}
