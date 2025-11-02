import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { startOfDate, endOfDate } from '../src/index.js';

function testDateFn(fn, input, output) {
  assert.equal(new Date(fn(input)).toISOString(), output, `${fn.name}(${input})`);
}

test('startOfDate', () => {
  testDateFn(startOfDate, '2025', '2025-01-01T00:00:00.000Z');
  testDateFn(startOfDate, '2025-Q1', '2025-01-01T00:00:00.000Z');
  testDateFn(startOfDate, '2025-q2', '2025-04-01T00:00:00.000Z');
  testDateFn(startOfDate, '2025-Q3', '2025-07-01T00:00:00.000Z');
  testDateFn(startOfDate, '2025-q4', '2025-10-01T00:00:00.000Z');
  testDateFn(startOfDate, '2025-02', '2025-02-01T00:00:00.000Z');
  testDateFn(startOfDate, '2025-02-W1', '2025-02-01T00:00:00.000Z');
  testDateFn(startOfDate, '2025-02-w2', '2025-02-08T00:00:00.000Z');
  testDateFn(startOfDate, '2025-02-03', '2025-02-03T00:00:00.000Z');
});

test('endOfDate', () => {
  testDateFn(endOfDate, '2025', '2025-12-31T23:59:59.000Z');
  testDateFn(endOfDate, '2025-Q1', '2025-03-31T23:59:59.000Z');
  testDateFn(endOfDate, '2025-q2', '2025-06-30T23:59:59.000Z');
  testDateFn(endOfDate, '2025-Q3', '2025-09-30T23:59:59.000Z');
  testDateFn(endOfDate, '2025-q4', '2025-12-31T23:59:59.000Z');
  testDateFn(endOfDate, '2025-02', '2025-02-28T23:59:59.000Z');
  testDateFn(endOfDate, '2025-03-W1', '2025-03-07T23:59:59.000Z');
  testDateFn(endOfDate, '2025-03-w2', '2025-03-14T23:59:59.000Z');
  testDateFn(endOfDate, '2025-03-W3', '2025-03-21T23:59:59.000Z');
  testDateFn(endOfDate, '2025-03-w4', '2025-03-31T23:59:59.000Z');
  testDateFn(endOfDate, '2025-03-03', '2025-03-03T23:59:59.000Z');
});

test.run();
