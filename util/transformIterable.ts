export default function transformIterable<T>(
  iter: AsyncIterable<T>,
  fn: (item: T) => T,
  done?: () => void,
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for await (const item of iter) {
        yield fn(item);
      }
      if (done) done();
    },
  };
}
