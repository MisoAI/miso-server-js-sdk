import { Transform } from 'stream';

const OUTPUT = {
  BOTH: 0,
  PLUS: 1,
  MINUS: 2,
};

export default class DiffStream extends Transform {

  constructor(data, {
    objectMode,
    readableObjectMode,
    writableObjectMode,
    ...options
  } = {}) {
    super({
      readableObjectMode: !!writableObjectMode || (readableObjectMode !== undefined ? !!readableObjectMode : objectMode !== undefined ? !!objectMode : false),
      writableObjectMode: writableObjectMode !== undefined ? !!writableObjectMode : objectMode !== undefined ? !!objectMode : false,
    });
    if (writableObjectMode && readableObjectMode !== undefined && !readableObjectMode) {
      throw new Error(`Cannot have writableObjectMode = true and readableObjectMode = false.`);
    }
    this._options = this._normalizeOptions(options);
    this._baseDataSet = new Set(data);
    this._inputDataSet = new Set();
  }

  _normalizeOptions({
    output,
    ...options
  }) {
    return {
      output: this._normalizeOutputOptions(output),
      ...options,
    };
  }

  _normalizeOutputOptions(output = 'default') {
    switch (output) {
      case 'plus':
        return OUTPUT.PLUS;
      case 'minus':
        return OUTPUT.MINUS;
      case 'default':
        return OUTPUT.BOTH;
      default:
        throw new Error(`Unrecognized output mode: ${output}`);
    }
  }

  _transform(value, _, next) {
    if (value instanceof Buffer) {
      value = value.toString();
    }
    // dedupe
    const input = this._inputDataSet;
    if (input.has(value)) {
      next();
      return;
    }
    input.add(value);

    const base = this._baseDataSet;
    if (base.has(value)) {
      base.delete(value);
    } else {
      this._output(true, value);
    }
    next();
  }

  async _flush(done) {
    for (const value of this._baseDataSet) {
      this._output(false, value);
    }
    done();
  }

  _output(plus, value) {
    switch (this._options.output) {
      case OUTPUT.BOTH:
        this.push(this.readableObjectMode ? [plus, value] : `${plus ? '+' : '-'} ${value}`);
        break;
      case OUTPUT.PLUS:
        if (plus) {
          this.push(value);
        }
        break;
      case OUTPUT.MINUS:
        if (!plus) {
          this.push(value);
        }
        break;
    }
  }

}
