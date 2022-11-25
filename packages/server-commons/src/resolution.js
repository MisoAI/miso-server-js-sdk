export default class Resolution {

  constructor() {
    const self = this;
    self.promise = new Promise((resolve, reject) => {
      self.resolve = resolve;
      self.reject = reject;
    });
    Object.freeze(this);
  }

  async resolveWith(fn) {
    try {
      this.resolve(await fn());
    } catch(error) {
      this.reject(error);
    }
  }

}
