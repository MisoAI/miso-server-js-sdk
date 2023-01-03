export default class DeletionStats {

  constructor() {
    this._records = 0;
    this._deleted = 0;
    this._notFound = 0;
  }

  get records() {
    return this._records;
  }

  get deleted() {
    return this._deleted;
  }

  get notFound() {
    return this._notFound;
  }

  track(request, { data: response }) {
    this._records += request.records;
    this._deleted += (response.deleted && response.deleted.count) || 0;
    this._notFound += (response.not_found && response.not_found.count) || 0;
  }

  snapshot() {
    const { records, deleted, notFound } = this;
    return Object.freeze({ records, deleted, notFound });
  }

}
