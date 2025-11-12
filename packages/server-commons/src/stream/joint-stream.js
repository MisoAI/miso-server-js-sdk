import { Readable } from 'stream';

export function joinStreams(streams, joinFn = defaultJoinFn) {
  if (typeof joinFn !== 'function') {
    throw new Error(`joinFn must be a function: ${joinFn}`);
  }
  return Readable.from(generate(streams, joinFn));
}

function defaultJoinFn(...args) {
  return args;
}

async function * generate(streams, joinFn) {
  const iterators = streams.map(stream => stream[Symbol.asyncIterator]());
  while (true) {
    const entries = await Promise.all(iterators.map(iterator => iterator.next()));
    if (entries.every(entry => entry.done)) {
      break;
    }
    yield joinFn(...entries.map(entry => entry.value));
  }
}
