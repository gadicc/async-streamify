import BufferedAsyncIterable from "../util/bufferedAsyncIterable.ts";
import isAsyncIterable from "../util/isAsyncIteratable.ts";

/**
 * Type for serialized promise references
 */
type SerializedPromise = {
  $promise: number;
};

/**
 * Type for serialized async iterator references
 */
type SerializedAsyncIterator = {
  $asyncIterator: number;
};

/**
 * Type for an active iterator tracking entry
 */
type ActiveIterator = {
  idx: number;
  iter: AsyncIterable<unknown>;
  nextPromise?: Promise<
    | void
    | IteratorYieldResult<unknown>
    | IteratorReturnResult<unknown>
    | undefined
  >;
  done?: boolean;
};

/**
 * Serializes objects containing promises and async iterables into a stream of updates.
 * Handles nested promises, async iterables, and regular object properties.
 *
 * @template TSource - The type of the source object being serialized
 *
 * @example
 * ```typescript
 * const obj = {
 *   name: "test",
 *   promise: Promise.resolve(42),
 *   async *numbers() {
 *     yield 1;
 *     yield 2;
 *   }
 * };
 *
 * const serializer = new AsyncObjectSerializer(obj);
 *
 * for await (const update of serializer) {
 *   console.log(update);
 *   // Initial: { name: "test", promise: { $promise: 1 }, numbers: { $asyncIterator: 2 } }
 *   // Promise resolved: [1, 42]
 *   // Iterator values: [2, { done: false, value: 1 }], [2, { done: false, value: 2 }]
 *   // Iterator done: [2, { done: true }]
 * }
 * ```
 */
export class AsyncObjectSerializer<TSource = object>
  extends BufferedAsyncIterable {
  private sourceObject: TSource;
  private serializationIdCounter: number = 1;
  private activeAsyncOperations: number = 0;
  private activeIterators: Array<ActiveIterator> = [];

  /**
   * Schedules updates for all active async iterators
   * @returns void
   */
  protected scheduleIteratorUpdates(): void {
    for (let i = 0; i < this.activeIterators.length; i++) {
      const thisIter = this.activeIterators[i];
      const { idx, iter, nextPromise, done } = thisIter;
      if (!done && !nextPromise) {
        thisIter.nextPromise = iter[Symbol.asyncIterator]().next().then(
          (result) => {
            this.push([idx, {
              done: result.done,
              value: this.serializeValue(result.value),
            }]);
            if (result.done) {
              thisIter.done = true;
              this.decrementActiveCount();
            }
            thisIter.nextPromise = undefined;
          },
        );
      }
    }
  }

  /**
   * Creates a new AsyncObjectSerializer instance
   * @param object - The source object to serialize
   */
  constructor(object: TSource) {
    super();
    this.sourceObject = object;

    // Option 1) queue all next()'s only when buffer is empty
    // this.onWait = this.scheduleIteratorUpdates;

    // Option 2) queue all next()'s on every next call = faster streaming
    this.onNext = this.scheduleIteratorUpdates;

    this.push(this.serializeValue(object));
    if (this.activeAsyncOperations === 0) {
      this.close();
    }
  }

  /**
   * Gets the next unique serialization ID and increments the active operation count
   * @returns number
   */
  private getNextSerializationId(): number {
    this.activeAsyncOperations++;
    return this.serializationIdCounter++;
  }

  /**
   * Decrements the active operation count and marks as done if no operations remain
   * @returns void
   */
  private decrementActiveCount(): void {
    this.activeAsyncOperations--;
    if (this.activeAsyncOperations === 0) {
      this.close();
    }
  }

  /**
   * Recursively serializes a value, handling promises, async iterables, and nested objects
   * @param value - The value to serialize
   * @returns The serialized value
   */
  private serializeValue(value: unknown): unknown {
    // Return primitives as-is: null, undefined, numbers, strings, etc.
    if (typeof value !== "object" || value === null) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((val) => this.serializeValue(val));
    }

    if (value instanceof Promise) {
      const idx = this.getNextSerializationId();
      value.then((resolved) => {
        this.push([idx, this.serializeValue(resolved)]);
        this.decrementActiveCount();
      });
      return { $promise: idx } as SerializedPromise;
    }

    if (isAsyncIterable(value)) {
      const idx = this.getNextSerializationId();
      this.activeIterators.push({
        idx,
        iter: value as AsyncIterable<unknown>,
      });
      return { $asyncIterator: idx } as SerializedAsyncIterator;
    }

    return Object.fromEntries(
      Object.entries(value).map((
        [key, val],
      ) => [key, this.serializeValue(val)]),
    );
  }
}

export default AsyncObjectSerializer;
