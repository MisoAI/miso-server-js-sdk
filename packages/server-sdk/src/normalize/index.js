import { Transform } from 'stream';
import { trimObj } from '@miso.ai/server-commons';
import * as shim from './shim.js';

export function products({
  cover_image,
  url,
  ...record
}) {
  // category -> assume single, categories -> assume multiple
  return trimObj({
    cover_image: shim.url(cover_image),
    url: shim.url(url),
    ...record,
  });
}

export function users({
  ...record
}) {
  return trimObj({
    ...record,
  });
}

export function interactions({
  ...record
}) {
  return trimObj({
    ...record,
  });
}

export function experimentEvents({
  ...record
}) {
  return trimObj({
    ...record,
  });
}

function getTransformFunction(type) {
  switch (type) {
    case 'products':
      return products;
    case 'users':
      return users;
    case 'interactions':
      return interactions;
    case 'experiment-events':
      return experimentEvents;
    default:
      throw new Error(`Unrecognized record type: ${type}`);
  }
}

export class Stream extends Transform {

  constructor(type) {
    super({
      objectMode: true,
    });
    this._transformFn = getTransformFunction(type);
  }

  _transform(record, _, next) {
    try {
      next(undefined, this._transformFn(record));
    } catch (error) {
      next(error);
    }
  }

}
