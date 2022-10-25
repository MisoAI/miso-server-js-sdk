import Entities from '../entities/index.js';
import defaultTransform from './transform-default.js';
import legacyTransform from './transform-legacy.js';

function getTransformFn(transform) {
  return typeof transform === 'function' ? post => transform(post, { defaultTransform }) :
    (transform === true || transform === 'default') ? defaultTransform :
    transform === 'legacy' ? legacyTransform : undefined;
}

const RESOURCE_NAME = 'posts';

export default class Posts extends Entities {

  constructor(client) {
    super(client, RESOURCE_NAME);
  }
  
  async stream({ transform, ...options } = {}) {
    return super.stream({ ...options, transform: getTransformFn(transform) });
  }

  async getAll() {
    throw new Error(`Getting all posts is not supported.`);
  }

  async index() {
    throw new Error(`Indexing posts is not supported.`);
  }

}
