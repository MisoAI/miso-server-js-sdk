import { asArray } from '@miso.ai/server-commons';

export const number = _applyGeneralPass(_number);
export const string = _applyGeneralPass(_string);
export const array = _applyGeneralPass(_array);
export const doubleArray = _applyGeneralPass(_doubleArray);
export const time = _applyGeneralPass(_time);
export const url = _applyGeneralPass(_url);

function _number(value) {
  value = Number(value);
  if (isNaN(value)) {
    throw new Error();
  }
  return value;
}

function _string(value) {
  // TODO
  return value;
}

function _array(value) {
  value = asArray(value).filter(isNotBlank);
  return value.length ? value : undefined;
}

function _doubleArray(value) {
  // TODO
  value;
}

function _time(value) {
  // TODO: how to handle timezone
  return value;
}

function _url(value) {
  // blank safe
  if (isBlank(value) || typeof value !== 'string') {
    return undefined;
  }
  // a wild guess on whether the URL has been encoded
  if (!value.includes('%')) {
    value = encodeURI(value);
  }
  // bounce on invalid URL
  new URL(value);

  return value;
}

function isNotBlank(value) {
  return !isBlank(value);
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function _applyGeneralPass(fn) {
  return value => {
    if (isBlank(value)) {
      return undefined;
    }
    try {
      return fn(value);
    } catch(_) {
      return value;
    }
  };
}
