import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Channel, WriteChannel, UpgradeChannel, DowngradeChannel, delay } from '../src/index.js';
import { generateDefaultSinkResponse } from '../src/channel/events.js';

function createDataPayload(index) {
  const id = `p${index}`;
  return {
    id,
    text: `text-${index}`,
  };
}

function createDataEvent(index) {
  const payload = createDataPayload(index);
  const { id } = payload;
  return {
    type: 'data',
    id,
    index,
    payload,
  };
}

const DATA_PAYLOADS = Array.from({ length: 10 }, (_, i) => createDataPayload(i));
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
  assert.equal(outputs.slice(1, -1), data);
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
        //await delay(100);
        writes.push(event.payload);
        return generateDefaultSinkResponse(event);
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

  // assert: n request & response events
  let expectedRequestIndex = 0, responseCount = 0, writeCount = 0;
  for (const event of outputs) {
    switch (event.type) {
      case 'request':
        assert.equal(event.index, expectedRequestIndex++);
        break;
      case 'response':
        responseCount++;
        assert.ok(event.index <= expectedRequestIndex);
        break;
      case 'write':
        writeCount++;
        assert.ok(event.index <= expectedRequestIndex);
        break;
    }
  }
  const expectedWriteCount = Math.ceil(data.length / recordCap);
  assert.equal(expectedRequestIndex, expectedWriteCount);
  assert.equal(responseCount, expectedWriteCount);
  assert.equal(writeCount, expectedWriteCount);

  //assert.equal(rest.length, expectedRequestCount);
  // there should be 
  //assert.equal(outputs.slice(1, -1), writes);
});

test('UpgradeChannel - object mode', async () => {
  const payloads = DATA_PAYLOADS.slice(0, 5);
  const outputs = [];

  const channel = new UpgradeChannel({
    name: 'upgrade',
    objectMode: true,
  });

  for (const payload of payloads) {
    channel.write(payload);
  }
  channel.end();

  for await (const event of channel) {
    outputs.push(event);
  }

  // assert: start & end events
  assert.equal(outputs[0].type, 'start');
  assert.equal(outputs[outputs.length - 1].type, 'end');

  // assert: data events
  const dataEvents = outputs.filter(e => e.type === 'data');
  assert.equal(dataEvents.length, payloads.length);
  for (let i = 0; i < payloads.length; i++) {
    assert.equal(dataEvents[i].id, payloads[i].id);
    assert.equal(dataEvents[i].payload, payloads[i]);
  }
});

test('UpgradeChannel - string mode', async () => {
  const payloads = DATA_PAYLOADS.slice(0, 3);
  const outputs = [];

  const channel = new UpgradeChannel({
    name: 'upgrade-string',
    objectMode: false,
  });

  for (const payload of payloads) {
    channel.write(JSON.stringify(payload));
  }
  channel.end();

  for await (const event of channel) {
    outputs.push(event);
  }

  // assert: start & end events
  assert.equal(outputs[0].type, 'start');
  assert.equal(outputs[outputs.length - 1].type, 'end');

  // assert: data events
  const dataEvents = outputs.filter(e => e.type === 'data');
  assert.equal(dataEvents.length, payloads.length);
  for (let i = 0; i < payloads.length; i++) {
    assert.equal(dataEvents[i].id, payloads[i].id);
    assert.equal(dataEvents[i].payload.id, payloads[i].id);
  }
});

test('UpgradeChannel - asId mode', async () => {
  const ids = DATA_PAYLOADS.slice(0, 3).map(p => p.id);
  const outputs = [];

  const channel = new UpgradeChannel({
    name: 'upgrade-as-id',
    objectMode: false,
    asId: true,
  });

  for (const id of ids) {
    channel.write(id);
  }
  channel.end();

  for await (const event of channel) {
    outputs.push(event);
  }

  // assert: start & end events
  assert.equal(outputs[0].type, 'start');
  assert.equal(outputs[outputs.length - 1].type, 'end');

  // assert: data events
  const dataEvents = outputs.filter(e => e.type === 'data');
  assert.equal(dataEvents.length, ids.length);
  for (let i = 0; i < ids.length; i++) {
    assert.equal(dataEvents[i].id, ids[i]);
  }
});

test('DowngradeChannel - object mode', async () => {
  const data = DATA_EVENTS.slice(0, 5);
  const outputs = [];

  const channel = new DowngradeChannel({
    objectMode: true,
  });

  channel.write({ type: 'start' });
  for (const event of data) {
    channel.write(event);
  }
  channel.write({ type: 'end' });
  channel.end();

  for await (const output of channel) {
    outputs.push(output);
  }

  // assert: only payloads from data events are output
  assert.equal(outputs.length, data.length);
  for (let i = 0; i < data.length; i++) {
    assert.equal(outputs[i], data[i].payload);
  }
});

test('DowngradeChannel - string mode', async () => {
  const data = DATA_EVENTS.slice(0, 3);
  const chunks = [];

  const channel = new DowngradeChannel({
    objectMode: false,
  });

  channel.write({ type: 'start' });
  for (const event of data) {
    channel.write(event);
  }
  channel.write({ type: 'end' });
  channel.end();

  for await (const chunk of channel) {
    chunks.push(chunk);
  }

  // assert: payloads are stringified (stream may buffer chunks together)
  const output = chunks.join('');
  const expected = data.map(e => JSON.stringify(e.payload)).join('');
  assert.equal(output, expected);
});

test.run();
