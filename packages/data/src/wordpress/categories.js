import { Entities, EntityIndex } from './entities.js';
import { asMap } from '@miso.ai/server-commons';

const RESOURCE_NAME = 'categories';

export default class Categories extends Entities {

  constructor(client) {
    super(client, RESOURCE_NAME);
  }
  
  async index() {
    return new CategoryIndex(await this.getAll());
  }

}

class CategoryIndex extends EntityIndex {

  constructor(categories) {
    super(categories, 'categories');
  }

  _build(entities) {
    this._index = asMap(entities);
    this._list = Object.freeze(shimFullPath(entities, this._index));
  }

  getNames(ids) {
    const shadowed = new Set();
    for (const id of ids) {
      const category = this.get(id);
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
        const category = this.get(id);
        if (category) {
          categories.push(category.fullPath.names);
        }
      }
    }
    return categories;
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
