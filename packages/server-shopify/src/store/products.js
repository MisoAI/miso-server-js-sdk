export default class Products {

  constructor(core) {
    this._core = core;
  }
  
  async explain(options) {
    return this._core.explain('products', options);
  }

  async count() {
    return this._core.count('products');
  }

  stream(options) {
    return this._core.stream('products', options);
  }

}
