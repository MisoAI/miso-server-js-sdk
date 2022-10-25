import { Transform } from 'stream';

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

export default class EntityTransformStream extends Transform {

  static getPropName(resource) {
    return PROP_NAME_OVERRIDES[resource] || resource;
  }

  constructor(client, indicies, { transform } = {}) {
    super({ objectMode: true });
    this._client = client;
    this._indicies = indicies;
    this._transformFn = transform;
  }

  async _transform(post, _, next) {
    try {
      post = await this._resolveLinkedEntities(post);
      if (this._transformFn) {
        post = await this._transformFn(post);
      }
      next(undefined, post);
    } catch (error) {
      next(error);
    }
  }

  async _resolveLinkedEntities(post) {
    const patches = await Promise.all(
      this._indicies.map(index => 
        index.patch(post, EntityTransformStream.getPropName(index.name)))
    );
    for (const patch of patches) {
      post = applyPatch(post, patch);
    }
    return post;
  }

}
