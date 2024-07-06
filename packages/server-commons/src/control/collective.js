import TaskControl from './base.js';

export default class CollectiveTaskControl extends TaskControl {

  constructor(...members) {
    super();
    this._members = members;
    this._unsubscribes = members.map((control) => control.on('ready', () => this._syncReady()));
    this._syncReady();
  }

  open(id, data) {
    for (const control of this._members) {
      control.open(id, data);
    }
  }

  close(id) {
    for (const control of this._members) {
      control.close(id);
    }
  }

  _syncReady() {
    this._setReady(this._members.every((control) => control.ready));
  }

  destroy() {
    for (const unsubscribe of this._unsubscribes) {
      unsubscribe();
    }
    for (const control of this._members) {
      control.destroy();
    }
    super.destroy();
  }

}
