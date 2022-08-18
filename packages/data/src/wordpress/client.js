import Helpers from './helpers.js';
import Posts from './posts.js';
import Categories from './categories.js';
import Users from './users.js';

export default class WordPressClient {

  constructor(site) {
    this._site = site;
    this._helpers = new Helpers(site);
    this.posts = new Posts(this);
    this.categories = new Categories(this);
    this.users = new Users(this);
  }

}
