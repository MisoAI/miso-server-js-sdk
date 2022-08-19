import { asMap, collectStream } from '@miso.ai/server-commons';

const RESOURCE_NAME = 'categories';

export default class Categories {

  constructor(client) {
    this._client = client;
  }
  
  async stream(options) {
    return this._client._helpers.stream(RESOURCE_NAME, options);
  }

  async getAll(options) {
    return collectStream(this.stream(options));
  }

  async count(options) {
    return this._client._helpers.count(RESOURCE_NAME, options);
  }

  async index() {
    return new CategoryIndex(await this.getAll());
  }

}

class CategoryIndex {

  constructor(categories) {
    this._index = asMap(categories);
    this._categories = Object.freeze(shimFullPath(categories, this._index));
    this.patch = this.patch.bind(this);
  }

  get categories() {
    return this._categories;
  }

  getCategory(id) {
    return this._index[id];
  }

  getNames(ids) {
    const shadowed = new Set();
    for (const id of ids) {
      const category = this._index[id];
      if (category) {
        const cids = category.fullPath.ids;
        for (let i = 0, len = cids.length - 1; i < len; i++) {
          shadowed.add(cids[i]);
        }
      }
    }
    const categories = [];
    for (const id of ids) {
      if (!shadowed.has(id)) {
        const category = this._index[id];
        if (category) {
          categories.push(category.fullPath.names);
        }
      }
    }
    return categories;
  }

  patch(post) {
    const { categories = [] } = post;
    return {
      ...post,
      categoryNames: this.getNames(categories),
    };
  }

}

function shimFullPath(categories, index) {
  // DP to compute full path
  function fullPath(category) {
    if (!category.fullPath) {
      const { parent, id, name } = category;
      if (parent) {
        const { ids, names } = fullPath(index[parent]);
        category.fullPath = {
          ids: [...ids, id],
          names: [...names, name],
        };
      } else {
        category.fullPath = {
          ids: [id],
          names: [name],
        };
      }
    }
    return category.fullPath;
  }

  return categories.map(c => {
    fullPath(c);
    return c;
  });
}
