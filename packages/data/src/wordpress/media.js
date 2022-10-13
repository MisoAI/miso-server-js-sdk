import { Entities, EntityIndex } from './entities.js';

const RESOURCE_NAME = 'media';

export default class Media extends Entities {

  constructor(client) {
    super(client, RESOURCE_NAME);
  }
  
  _createIndex() {
    return new EntityIndex(this, {
      process,
      value: en => en.source_url,
    });
  }

}

function process({ id, date, date_gmt, alt_text, media_details: { width, height, filesize }, source_url }) {
  return { id, date, date_gmt, alt_text, width, height, filesize, source_url };
}
