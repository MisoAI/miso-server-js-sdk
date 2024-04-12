import { Transform } from 'stream';

export default class StatusStream extends Transform {

  constructor(client, type) {
    super({
      objectMode: true,
    });
    this._client = client;
    this._type = type;
  }

  async _transform(task_id, _, next) {
    try {
      this.push({
        task_id,
        ...(await this._client.api[this._type].status(task_id)),
      });
    } catch (err) {
      this.push({
        task_id,
        errors: true,
        error: summarizeError(err),
      });
    }
    next();
  }

}

function summarizeError(error) {
  if (error.response) {
    const { status, data } = error.response;
    return {
      response: { status, data },
    };
  } else if (error.message) {
    return {
      message: error.message,
    };
  } else {
    return {
      message: `${error}`,
    };
  }
}
