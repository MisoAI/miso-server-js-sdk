import { Writable } from 'stream';
import { createLogUpdate } from 'log-update';
import { isError } from '../log/index.js'
import { unimplemented } from '../object.js';

function defaultRenderError(data = {}) {
  if (data.level && isError(data.level)) {
    return JSON.stringify(data) + '\n';
  }
  return undefined;
}

export default class LogUpdateStream extends Writable {

  constructor({
    out = process.stdout,
    err = process.stderr,
    render = unimplemented,
    renderError = defaultRenderError,
  } = {}) {
    super({
      objectMode: true,
    });
    this._update = createLogUpdate(out);
    this._err = err;
    this._fns = {
      render,
      renderError,
    };
  }

  _write(data, _, next) {
    const errorMsg = this._renderError(data);
    errorMsg && this._err.write(errorMsg);
    this._update(this._render(data));
    next();
  }

  _render(data) {
    return this._fns.render(data);
  }

  _renderError(data) {
    return this._fns.renderError(data);
  }

}
