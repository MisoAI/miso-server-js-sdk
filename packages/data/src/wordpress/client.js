import { defineValues, copyValues, trimObj, loadConfigSync, saveConfig, splitObj, fileExistsSync } from '@miso.ai/server-commons';
import { constants } from 'fs';
import Helpers from './helpers.js';
import Posts from './posts.js';
import { Entities } from './entities.js';

const DEFAULT_PROFILE = './wordpress.json';

export default class WordPressClient {

  constructor({ profile, ...options } = {}) {
    if (!profile && fileExistsSync(DEFAULT_PROFILE, constants.R_OK)) {
      profile = DEFAULT_PROFILE;
    }
    if (profile) {
      options = { ...loadConfigSync(profile), ...options };
    }
    if (!options.site) {
      throw new Error(`Require 'site' property in either options or profile.`);
    }
    defineValues(this, { site: options.site });
    let profileObj;
    [profileObj, options] = splitObj(options, SITE_PROFILE_PROPS);
    this._options = options;
    this._profile = new SiteProfile(profileObj);

    this._helpers = new Helpers(this);
    this._entities = {
      posts: new Posts(this),
    };
  }

  async generateProfile() {
    this._profile.clear();
    // write UTC offset
    await this._helpers.utcOffsetInMs();
  }

  async saveProfile(file = DEFAULT_PROFILE) {
    await saveConfig(file, this._profile.export());
  }

  get profile() {
    return this._profile.export();
  }

  taxonomies(options) {
    return this._helpers.taxonomies(options);
  }

  get posts() {
    return this.entities('posts');
  }

  get users() {
    return this.entities('users');
  }

  entities(name) {
    return this._entities[name] || (this._entities[name] = new Entities(this, name));
  }

}

const SITE_PROFILE_PROPS = ['site', 'utcOffset'];

class SiteProfile {

  constructor(profile) {
    profile && this.load(profile);
  }

  clear() {
    for (const key in this) {
      if (key !== 'site') {
        delete this[key];
      }
    }
  }

  load(profile) {
    copyValues(this, profile, SITE_PROFILE_PROPS);
  }

  export() {
    return trimObj(copyValues({}, this, SITE_PROFILE_PROPS));
  }

}
