import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Channel, WriteChannel } from '../src/index.js';

function createDataEvent(i) {
  const id = `p${i}`;
  return {
    type: 'data',
    id,
    payload: {
      id,
      text: `text-${i}`,
    },
  };
}

const DATA_EVENTS = Array.from({ length: 10 }, (_, i) => createDataEvent(i));

test('Channel', async () => {
  const data = DATA_EVENTS.slice(0, 5);
  const outputs = [];

  const channel = new Channel({
    name: 'channel',
  });
  channel.write({ type: 'start' });
  for (const event of data) {
    channel.write(event);
  }
  channel.write({ type: 'end' });
  channel.end();

  for await (const event of channel) {
    outputs.push(event);
  }

  assert.equal(outputs[0].type, 'start');
  assert.equal(outputs.slice(1, -1), data.map(event => ({ ...event, depth: 1 })));
  assert.equal(outputs[outputs.length - 1].type, 'end');
});

test('WriteChannel', async () => {
  const data = DATA_EVENTS;
  const recordCap = 4;
  const outputs = [];
  const writes = [];
  const channel = new WriteChannel({
    name: 'write',
    buffer: {
      recordCap,
      byteCap: 1024 * 1024,
    },
    sink: {
      write: async (event) => {
        writes.push(event.payload);
      }
    },
    async transform(event) {
      if (event.type === 'data') {
        await this.writeData(event);
      }
    },
    /*
    sinkGate: {
      writesPerSecond: 10,
      recordsPerSecond: 100000,
      bytesPerSecond: 1024 * 1024,
    },
    */
  });
  channel.write({ type: 'start' });
  for (const event of data) {
    channel.write(event);
  }
  channel.write({ type: 'end' });
  channel.end();

  for await (const event of channel) {
    outputs.push(event);
  }

  // assert: start & end events
  assert.equal(outputs[0].type, 'start');
  assert.equal(outputs[outputs.length - 1].type, 'end');

  // assert: n request & response events, with index in order
  let expectedRequestIndex = 0, expectedResponseIndex = 0;
  for (const event of outputs) {
    switch (event.type) {
      case 'request':
        assert.equal(event.index, expectedRequestIndex++);
        assert.ok(expectedRequestIndex >= expectedResponseIndex);
        break;
      case 'response':
        assert.equal(event.index, expectedResponseIndex++);
        assert.ok(expectedRequestIndex >= expectedResponseIndex);
        break;
    }
  }
  const expectedRequestCount = Math.ceil(data.length / recordCap);
  assert.equal(expectedRequestIndex, expectedRequestCount);
  assert.equal(expectedResponseIndex, expectedRequestCount);

  //assert.equal(rest.length, expectedRequestCount);
  // there should be 
  //assert.equal(outputs.slice(1, -1), writes);
});

test.run();
