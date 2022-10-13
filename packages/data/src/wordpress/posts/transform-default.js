import { trimObj, asArray } from '@miso.ai/server-commons';

export default function transform({
  _linked = {},
  id,
  //type,
  date_gmt,
  modified_gmt,
  guid: {
    rendered: guid,
  },
  slug,
  title: {
    rendered: title,
  },
  content: {
    rendered: html,
  },
  author: author_id,
  categories: category_ids,
  tags: tag_ids,
  link: url,
  featured_media: featured_media_id,
  status,
  sticky,
  comment_status,
  ping_status,
  format,
  template,
}) {
  const product_id = `${id}`;
  if (!product_id) {
    throw new Error(`ID is absent.`);
  }
  const created_at = date_gmt && `${date_gmt}Z`;
  const updated_at = modified_gmt && `${modified_gmt}Z`;
  const authors = asArray(_linked.author);
  const cover_image = _linked.featured_media && encodeURI(_linked.featured_media);
  const categories = _linked.categories;
  const tags = _linked.tags;

  return trimObj({
    product_id,
    type: 'article',
    created_at,
    updated_at,
    title,
    cover_image,
    html,
    url,
    authors,
    categories,
    tags,
    custom_attributes: trimObj({
      guid,
      slug,
      status,
      sticky,
      comment_status,
      ping_status,
      format,
      template,
      author_id,
      category_ids,
      tag_ids,
      featured_media_id,
    }),
  });
}
