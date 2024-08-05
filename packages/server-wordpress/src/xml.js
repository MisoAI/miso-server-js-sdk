export class XmlParser {

  constructor({ ...options } = {}) {
    this._options = options;
    this._currentNode = undefined;
    this._currentText = '';
    this._currentPostMeta = {};
  }

  _onOpenTag({ name }) {
    if (name === 'item') {
      this._currentNode = { categories: [], tags: [], postmeta: {} };
    } else if (this._currentNode) {
      this._currentNode[name] = '';
    }
  }

  onCloseTag({ name }, { push }) {
    if (this._currentNode) {
      switch (name) {
        case 'item':
          push(nodeToPost(this._currentNode));
          this._currentNode = undefined;
          break;
        case 'category':
          this._currentNode.categories.push(this._currentText);
          break;
        case 'wp:meta_key':
          this._currentPostMetaKey = this._currentText;
          break;
        case 'wp:meta_value':
          this._currentNode.postmeta[this._currentPostMetaKey] = this._currentText;
          this._currentPostMetaKey = undefined;
          break;
        default:
          if (name.startsWith('wp:tag')) {
            this._currentNode.tags.push(this._currentText);
          } else {
            this._currentNode[name] = this._currentText;
          }
      }
    }
    this._currentText = '';
  }

  onText(text) {
    this._currentText += text.trim();
  }

}

function nodeToPost(node) {
  return {
    id: node['wp:post_id'],
    date: node['wp:post_date'],
    date_gmt: node['wp:post_date_gmt'],
    modified: node['wp:post_modified'],
    modified_gmt: node['wp:post_modified_gmt'],
    slug: node['wp:post_name'],
    status: node['wp:status'],
    title: node['title'],
    link: node['link'],
    guid: {
      rendered: node['guid'],
    },
    content: {
      rendered: node['content:encoded'],
    },
    excerpt: {
      rendered: node['excerpt:encoded'],
    },
    author: node['dc:creator'],
    featured_media: node['wp:attachment_url'] || null,
    comment_status: node['wp:comment_status'],
    ping_status: node['wp:ping_status'],
    categories: node.categories,
    tags: node.tags,
    type: node['wp:post_type'],
    meta: node.postmeta,
  };
}
