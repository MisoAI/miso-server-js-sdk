/**
 * Remove object properties with undefined values and return the object itself.
 */
export function trimObj(obj) {
  if (typeof obj !== 'object') {
    return obj;
  }
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] === undefined) {
      delete obj[k];
    }
  }
  return obj;
}

export function splitObj(source, propNames) {
  const propSet = new Set(propNames);
  const a = {}, b = {};
  for (const name in source) {
    if (source.hasOwnProperty(name)) {
      (propSet.has(name) ? a : b)[name] = source[name];
    }
  }
  return [a, b];
}

export function asArray(value) {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export function asMap(objects, {key = 'id', target = {}} = {}) {
  return objects.reduce((acc, c) => {
    acc[c[key]] = c;
    return acc;
  }, target);
}

export function asNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  value = Number(value);
  return isNaN(value) ? undefined : value;
}

export function computeIfAbsent(map, key, fn) {
  if (map.has(key)) {
    return map.get(key);
  }
  const value = fn(key);
  map.set(key, value);
  return value;
}

/**
 * Assign values on target object with Object.defineProperties() from source object.
 */
 export function defineValues(target, source) {
  for (const name in source) {
    if (source.hasOwnProperty(name)) {
      Object.defineProperty(target, name, { value: source[name] });
    }
  }
}

export function copyValues(target, source, propNames) {
  for (const name of propNames || Object.keys(source)) {
    if (source.hasOwnProperty(name)) {
      target[name] = source[name];
    }
  }
  return target;
}

export function unimplemented() {
  throw new Error(`Unimplemented!`);
}
