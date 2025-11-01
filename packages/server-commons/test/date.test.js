import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { startOfDate, endOfDate } from '../src/index.js';

test('startOfDate', () => {
  assert.equal(startOfDate('2025'), Date.parse('2025-01-01T00:00:00Z'));
  assert.equal(startOfDate('2025-Q1'), Date.parse('2025-01-01T00:00:00Z'));
  assert.equal(startOfDate('2025-q2'), Date.parse('2025-04-01T00:00:00Z'));
  assert.equal(startOfDate('2025-Q3'), Date.parse('2025-07-01T00:00:00Z'));
  assert.equal(startOfDate('2025-q4'), Date.parse('2025-10-01T00:00:00Z'));
  assert.equal(startOfDate('2025-02'), Date.parse('2025-02-01T00:00:00Z'));
  assert.equal(startOfDate('2025-02-W1'), Date.parse('2025-02-01T00:00:00Z'));
  assert.equal(startOfDate('2025-02-w2'), Date.parse('2025-02-08T00:00:00Z'));
  assert.equal(startOfDate('2025-02-03'), Date.parse('2025-02-03T00:00:00Z'));
});

test('endOfDate', () => {
  assert.equal(endOfDate('2025'), Date.parse('2025-12-31T23:59:59Z'));
  assert.equal(endOfDate('2025-Q1'), Date.parse('2025-03-31T23:59:59Z'));
  assert.equal(endOfDate('2025-q2'), Date.parse('2025-06-30T23:59:59Z'));
  assert.equal(endOfDate('2025-Q3'), Date.parse('2025-09-30T23:59:59Z'));
  assert.equal(endOfDate('2025-q4'), Date.parse('2025-12-31T23:59:59Z'));
  assert.equal(endOfDate('2025-02'), Date.parse('2025-02-28T23:59:59Z'));
  assert.equal(endOfDate('2025-03-W1'), Date.parse('2025-03-07T23:59:59Z'));
  assert.equal(endOfDate('2025-03-w2'), Date.parse('2025-03-14T23:59:59Z'));
  assert.equal(endOfDate('2025-03-W3'), Date.parse('2025-03-21T23:59:59Z'));
  assert.equal(endOfDate('2025-03-w4'), Date.parse('2025-03-31T23:59:59Z'));
  assert.equal(endOfDate('2025-03-03'), Date.parse('2025-03-03T23:59:59Z'));
});

test.run();
