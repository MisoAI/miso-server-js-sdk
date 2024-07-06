import EventEmitter from 'events';

export default class TaskControl {

  constructor() {
    this._events = new EventEmitter();
    this._ready = true;
  }

  on(event, listener) {
    this._events.on(event, listener);
    return () => this._events.off(event, listener);
  }

  once(event, listener) {
    this._events.once(event, listener);
    return () => this._events.off(event, listener);
  }

  open(id, data) {}

  close(id) {}

  get ready() {
    return this._ready;
  }

  _setReady(value) {
    value = !!value
    if (this._ready === value) {
      return;
    }
    this._ready = value;
    this._events.emit('ready', value);
  }

  destroy() {
    this._events.removeAllListeners();
  }

}
