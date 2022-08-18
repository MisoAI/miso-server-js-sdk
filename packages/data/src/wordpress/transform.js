import { trimObj, asArray } from '@miso.ai/server-commons';

export default function transform({
  id,
  type,
  date_gmt,
  modified_gmt,
  title: {
    rendered: title,
  },
  content: {
    rendered: html,
  },
  author: authorId,
  authorName,
  categories: categoryIds,
  categoryNames: categories,
  tags_names: tags,
  link: url,
  better_featured_image,
  status,
  sticky,
  comment_status,
  ping_status,
  format,
  yoast,
}) {
  const product_id = `${id}`;
  if (!product_id) {
    throw new Error(`ID is absent.`);
  }
  const created_at = date_gmt && `${date_gmt}Z`;
  const updated_at = modified_gmt && `${modified_gmt}Z`;
  const authors = asArray(authorName);

  // TODO: ad-hoc
  const description = yoast && yoast.metadesc;
  const cover_image = better_featured_image && better_featured_image.source_url && encodeURI(better_featured_image.source_url);

  return trimObj({
    product_id,
    type,
    created_at,
    updated_at,
    title,
    description,
    html,
    cover_image,
    url,
    authors,
    categories,
    tags,
    custom_attributes: trimObj({
      status,
      sticky,
      comment_status,
      ping_status,
      format,
      authorId,
      categoryIds,
    }),
  });
}
