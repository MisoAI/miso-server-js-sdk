import { Transform } from 'stream';
import defaultTransform from './transform-default.js';
import legacyTransform from './transform-legacy.js';

function getTransformFn(transform) {
  return typeof transform === 'function' ? transform :
    (transform === true || transform === 'default') ? defaultTransform :
    transform === 'legacy' ? legacyTransform : undefined;
}

function applyPatch(post, patch) {
  if (!patch) {
    return post;
  }
  return {
    ...post,
    _linked: {
      ...post._linked,
      ...patch,
    },
  };
}

const PROP_NAME_OVERRIDES = {
  users: 'author',
  media: 'featured_media',
};

export default class PostTransformStream extends Transform {

  static getPropName(resource) {
    return PROP_NAME_OVERRIDES[resource] || resource;
  }

  constructor(client, indicies, { transform } = {}) {
    super({ objectMode: true });
    this._client = client;
    this._indicies = indicies;
    this._transformFn = getTransformFn(transform);
  }

  async _transform(post, _, next) {
    try {
      post = await this._resolveLinkedEntities(post);
      if (this._transformFn) {
        post = await this._transformFn(post, { defaultTransform });
      }
      next(undefined, post);
    } catch (error) {
      next(error);
    }
  }

  async _resolveLinkedEntities(post) {
    const patches = await Promise.all(
      this._indicies.map(index => 
        index.patch(post, PostTransformStream.getPropName(index.name)))
    );
    for (const patch of patches) {
      post = applyPatch(post, patch);
    }
    return post;
  }

}
