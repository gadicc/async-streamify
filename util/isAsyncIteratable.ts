/**
 * Type guard that checks if a value implements the AsyncIterable interface
 *
 * @param obj - The value to check for async iterability
 * @returns boolean - True if the value is an async iterable, false otherwise
 *
 * @example
 * ```typescript
 * const asyncGen = async function*() {
 *   yield 1;
 *   yield 2;
 * };
 *
 * console.log(isAsyncIterable(asyncGen())); // true
 * console.log(isAsyncIterable([1, 2, 3])); // false
 * console.log(isAsyncIterable(Promise.resolve(42))); // false
 * console.log(isAsyncIterable(null)); // false
 * ```
 */
export default function isAsyncIterable(
  obj: unknown,
): obj is AsyncIterable<unknown> {
  if (obj === null || typeof obj !== "object") {
    return false;
  }

  return Symbol.asyncIterator in obj &&
    typeof (obj as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function";
}
