import { Transform } from 'stream';

export function products(record) {
  return record;
}

export function users(record) {
  return record;
}

export function interactions(record) {
  return record;
}

export function experimentEvents(record) {
  return record;
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

  async _transform(record, _, next) {
    try {
      next(undefined, this._transformFn(record));
    } catch (error) {
      next(error);
    }
  }

}
