import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Writable } from 'stream';
import { stream, delay } from '../src/index.js';

test('EasyTransform', async () => {
  const events = [];
  const output = [];
  const writable = new Writable({
    objectMode: false,
    write(chunk, encoding, next) {
      events.push(`writable:write:${chunk}`);
      output.push(`${chunk}`);
      this._next = next;
    },
  });
  Object.assign(writable, {
    _next: undefined,
    callNext() {
      const next = this._next;
      if (!next) {
        return;
      }
      this._next = undefined;
      next();
    },
  });
  const transform = new stream.EasyTransform({
    async transform(chunk, encoding) {
      events.push(`transform:transform:${chunk}`);
      this._pushBuffer(chunk, encoding);
    },
    async flush() {
      events.push('transform:flush');
      this._pushBuffer('end');
    },
  });
  transform.pipe(writable);

  transform.write('hello');
  transform.write('world');
  transform.end();

  events.push('writable:next');
  writable.callNext();
  await delay();
  events.push('writable:next');
  writable.callNext();
  await delay();

  assert.equal(output, ['hello', 'world', 'end']);
  assert.equal(events, [
    'transform:transform:hello',
    'writable:write:hello',
    'writable:next',
    'transform:transform:world',
    'writable:write:world',
    'transform:flush',
    'writable:next',
    'writable:write:end',
  ]);
});

test.run();
