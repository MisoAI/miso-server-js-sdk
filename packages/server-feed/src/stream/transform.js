import { trimObj } from '@miso.ai/server-commons';
import { Transform } from 'stream';

export default class ArticleTransformStream extends Transform {

  constructor({ after } = {}) {
    super({ objectMode: true });
    this._after = after;
  }

  async _transform({
    title,
    description,
    summary,
    date,
    pubdate,
    link,
    origlink,
    guid,
    image,
    author,
    categories,
  }, _) {
    if (this._after !== undefined) {
      try {
        const timestamp = Date.parse(date);
        if (timestamp < this._after) {
          this.end();
          return;
        }
      } catch (err) {
        console.error(err);
        this.end();
        return;
      }
    }
    const authors = author ? [author] : [];
    title = title || undefined;
    categories = categories && categories.map(c => [c]) || [];
    const url = origlink || link || undefined;
    const cover_image = image && image.url || undefined;
    summary = summary || undefined;
    this.push(trimObj({
      product_id: guid,
      type: 'article',
      title,
      updated_at: date || undefined,
      published_at: pubdate || undefined,
      created_at: pubdate || undefined,
      categories,
      url,
      cover_image,
      authors,
      html: description || undefined,
      custom_attributes: trimObj({
        summary,
      }),
    }));
  }

}
