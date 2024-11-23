/**
 * Transforms an async iterable by applying a transformation function to each item
 *
 * @template TInput - The type of items in the input iterable
 * @template TOutput - The type of items in the output iterable
 *
 * @param iter - The source async iterable
 * @param fn - The transformation function to apply to each item
 * @param done - Optional callback that is called when iteration is complete
 * @returns AsyncIterable<TOutput> - A new async iterable with transformed items
 *
 * @example
 * ```typescript
 * // Transform numbers to strings
 * const numbers = async function*() {
 *   yield 1;
 *   yield 2;
 *   yield 3;
 * };
 *
 * const strings = transformIterable(
 *   numbers(),
 *   num => String(num),
 *   () => console.log('Done!')
 * );
 *
 * for await (const str of strings) {
 *   console.log(str); // "1", "2", "3"
 * }
 * // Prints: Done!
 *
 * // Transform with same type
 * const doubled = transformIterable(
 *   numbers(),
 *   num => num * 2
 * );
 *
 * for await (const num of doubled) {
 *   console.log(num); // 2, 4, 6
 * }
 * ```
 */
export default function transformIterable<TInput, TOutput = TInput>(
  iter: AsyncIterable<TInput>,
  fn: (item: TInput) => TOutput,
  done?: () => void,
): AsyncIterable<TOutput> {
  return {
    [Symbol.asyncIterator]: async function* () {
      try {
        for await (const item of iter) {
          yield fn(item);
        }
      } finally {
        if (done) done();
      }
    },
  };
}
