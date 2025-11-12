import saxes from 'saxes';
import { trimObj } from '@miso.ai/server-commons';

function defaultPreprocessXml(xml) {
  return xml.trim().replace(/\r\n\s*/g, ' ').replaceAll('> <', '><');
}

function defaultPreprocessText(v) {
  return v.trim();
}

export function xmlQuery(xml, {
  xmlFragment = false,
  preprocessXml = defaultPreprocessXml,
  preprocessText = defaultPreprocessText,
} = {}) {
  if (!xml) {
    return undefined;
  }
  xml = preprocessXml(xml);
  const parser = new saxes.SaxesParser({ fragment: xmlFragment });

  const root = RootModel.create();
  let cursor = root;
  parser.on('opentag', node => {
    cursor = ElementModel.create(cursor, node);
  });
  parser.on('text', value => {
    TextModel.create(cursor, preprocessText(value));
  });
  parser.on('closetag', node => {
    cursor = cursor._parent;
  });

  parser.write(xml);
  parser.end();

  return root;
}

Object.assign(xmlQuery, {
  defaultPreprocessXml,
  defaultPreprocessText,
});

function proxy(model) {
  return new Proxy(model, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      if (typeof prop === 'string' && prop.charAt(0) !== '_') {
        return target.get(prop);
      }
      return undefined;
    },
  });
}

class ValueModel {

  constructor(type) {
    this._type = type;
  }

  get intValue() {
    const { textValue } = this;
    if (!textValue) {
      return undefined;
    }
    const intValue = parseInt(textValue, 10);
    if (isNaN(intValue)) {
      throw new Error(`Not an integer: ${textValue}`);
    }
    return intValue;
  }

}

class ChildlessModel extends ValueModel {

  constructor(type) {
    super(type);
  }

  get() {
    return NullModel.instance;
  }

  all() {
    return PluralModel.nullInstance;
  }

  get outerHtml() {
    return undefined;
  }

  get innerHtml() {
    return undefined;
  }

}

class ParentModel extends ValueModel {

  constructor(type) {
    super(type);
    this._nodes = [];
    this._children = [];
  }

  get(selector) {
    for (const element of this._children) {
      if (element.match(selector)) {
        return element;
      }
    }
    return NullModel.instance;
  }

  all(selector) {
    const members = [];
    for (const element of this._children) {
      if (element.match(selector)) {
        members.push(element);
      }
    }
    return PluralModel.create(members);
  }

  get textValue() {
    return this._nodes.filter(node => node._type === 'text').map(node => node._value).join('');
  }

  get innerHtml() {
    return this._nodes.map(node => node._type === 'text' ? node._value : node.outerHtml).join('');
  }

}

class RootModel extends ParentModel {

  static create() {
    return proxy(new RootModel());
  }

  constructor() {
    super('root');
  }

}

class ElementModel extends ParentModel {

  static create(parent, node) {
    const element = new ElementModel(parent, node);
    const p = proxy(element);
    parent._children.push(p);
    parent._nodes.push(p);
    return p;
  }

  constructor(parent, { name, attributes, isSelfClosing }) {
    super('element');
    this._parent = parent;
    this._tagName = name;
    this._originalAttributes = attributes;
    this._isSelfClosing = isSelfClosing;

    this._name = toKeyFormat(name);
    this._attributes = {};
    for (let [key, value] of Object.entries(attributes)) {
      key = toKeyFormat(key);
      this._attributes[key] = AttributeModel.create(key, value);
    }
  }

  attr(key) {
    return this._attributes[toKeyFormat(key)] || NullModel.instance;
  }

  get attrs() {
    return { ...this._attributes };
  }

  get(selector) {
    const parsedSelector = parseSelector(selector);
    if (parsedSelector.attributes.length === 0 && parsedSelector.name) {
      const attr = this._attributes[parsedSelector.name];
      if (attr) {
        return attr;
      }
    }
    for (const element of this._children) {
      if (element.match(selector)) {
        return element;
      }
    }
    return NullModel.instance;
  }

  match(selector) {
    const { name, attributes } = parseSelector(selector);
    if (name && this._name !== name) {
      return false;
    }
    for (let { key, operator, value } of attributes) {
      const myAttr = this._attributes[key];
      if (!myAttr) {
        return false;
      }
      if (!operator) {
        continue;
      }
      if (!testStatement(myAttr.textValue, operator, value)) {
        return false;
      }
    }
    return true;
  }

  get outerHtml() {
    // TODO: escape attributes
    return `<${this._tagName}${Object.entries(this._originalAttributes).map(([key, value]) => ` ${key}="${value}"`).join('')}` +
      (this._isSelfClosing ? '/>' : `>${this.innerHtml}</${this._tagName}>`);
  }

}

class AttributeModel extends ChildlessModel {

  static create(key, value) {
    return proxy(new AttributeModel(key, value));
  }

  constructor(key, value) {
    super('attribute');
    this.key = toKeyFormat(key);
    this.textValue = value;
  }

  match(selector) {
    const { name, attributes } = parseSelector(selector);
    return attributes.length === 0 && this.key === name;
  }

}

class TextModel {

  static create(parent, value) {
    const text = new TextModel(value);
    parent._nodes.push(text);
    return text;
  }

  constructor(value) {
    this._type = 'text';
    this._value = value;
  }

}

class NullModel extends ChildlessModel {

  static _instance;

  static get instance() {
    return NullModel._instance || (NullModel._instance = proxy(new NullModel()));
  }

  constructor() {
    super('null');
  }

  match() {
    return false;
  }

  get textValue() {
    return undefined;
  }

}

class PluralModel {

  static _nullInstance;

  static get nullInstance() {
    return PluralModel._nullInstance || (PluralModel._nullInstance = proxy(new PluralModel([])));
  }

  static create(members) {
    return members.length ? proxy(new PluralModel(members)) : PluralModel.nullInstance;
  }

  constructor(members) {
    this._type = 'plural';
    this._members = members;
  }

  get(selector) {
    return PluralModel.create(this._members.map(m => m.get(selector)));
  }

  map(fn) {
    return this._members.map(fn);
  }

  reduce(fn, initialValue) {
    return this._members.reduce(fn, initialValue);
  }

  filter(fn) {
    return PluralModel.create(this._members.filter(fn));
  }

  [Symbol.iterator]() {
    return this._members[Symbol.iterator]();
  }

  get textValues() {
    return this.map(m => m.textValue);
  }

  get intValues() {
    return this.map(m => m.intValue);
  }

  get innerHtmls() {
    return this.map(m => m.innerHtml);
  }

  get outerHtmls() {
    return this.map(m => m.outerHtml);
  }

}

function parseSelector(selector) {
  let name;
  const attributes = [];
  if (selector === '*') {
    return { attributes };
  }
  const len = selector.length;
  let i = selector.indexOf('[');
  if (i === -1) {
    i = len;
  }
  name = toKeyFormat(selector.slice(0, i)) || undefined;
  let j;
  while (i < len) {
    if (selector.charAt(i) !== '[') {
      throw new Error(`Invalid selector: ${selector}`);
    }
    j = selector.indexOf(']', i + 1);
    if (j === -1) {
      throw new Error(`Invalid selector: ${selector}`);
    }
    const attr = selector.slice(i + 1, j);
    attributes.push(parseSelectorAttribute(attr));
    i = j + 1;
  }
  return trimObj({
    name,
    attributes,
  });
}

const SELECTOR_ATTRIBUTE_REGEX = /^([-\w]+)\s*(?:([!=^$*])\s*"(.+)")?$/;

function parseSelectorAttribute(attribute) {
  const match = attribute.match(SELECTOR_ATTRIBUTE_REGEX);
  if (!match) {
    throw new Error(`Invalid selector attribute: ${attribute}`);
  }
  return trimObj({
    key: toKeyFormat(match[1]),
    operator: match[2],
    value: match[3],
  });
}

function testStatement(myValue, operator, selectorValue) {
  switch (operator) {
    case '=':
      return myValue === selectorValue;
    case '!=':
      return myValue !== selectorValue;
    case '^=':
      return myValue.startsWith(selectorValue);
    case '$=':
      return myValue.endsWith(selectorValue);
    case '*=':
      return myValue.includes(selectorValue);
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function toKeyFormat(str) {
  return str.replace(/[-_:.]([0-9A-Za-z])/g, ([_, letter]) => letter.toUpperCase());
}
