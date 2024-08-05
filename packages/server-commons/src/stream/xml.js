import { Transform } from 'stream';
import { SaxesParser } from 'saxes';

function normalizeSaxesOptions({
  ...options
} = {}) {
  return {
    ...options,
  };
}

function bindHandler(context, saxes, parser, event, method) {
  parser[method] && saxes.on(event, data => parser[method](data, context));
}

export default class XmlParseStream extends Transform {

  constructor(parser, { saxes, ...options } = {}) {
    super({
      ...options,
      writableObjectMode: false,
      readableObjectMode: true,
    });
    this._options = options;
    const saxesParser = this._saxes = new SaxesParser(normalizeSaxesOptions(saxes));
    const context = Object.freeze({
      stream: this,
      push: this.push.bind(this),
      emit: this.emit.bind(this),
    });

    bindHandler(context, saxesParser, parser, 'opentag', 'onOpenTag');
    bindHandler(context, saxesParser, parser, 'closetag', 'onCloseTag');
    bindHandler(context, saxesParser, parser, 'text', 'onText');
    bindHandler(context, saxesParser, parser, 'cdata', 'onCData');
    bindHandler(context, saxesParser, parser, 'error', 'onError');

    if (!this._options.surpressErrors) {
      bindHandler(context, saxesParser, 'error', this._onError);
    }
  }

  _transform(chunk, encoding, next) {
    this._saxes.write(chunk);
    next();
  }

  _onError(err) {
    this.emit('error', err);
  }
}
