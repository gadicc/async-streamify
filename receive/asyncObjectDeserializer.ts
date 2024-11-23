import BufferedAsyncIterable from "../util/bufferedAsyncIterable.ts";

/**
 * Type for a promise resolution handler
 */
type PromiseHandler = {
  resolve: (value: object) => void;
  reject: (reason?: unknown) => void;
};

/**
 * Type for a serialized promise reference
 */
type SerializedPromise = {
  $promise: number;
};

/**
 * Type for a serialized async iterator reference
 */
type SerializedAsyncIterator = {
  $asyncIterator: number;
};

/**
 * Deserializes objects that were serialized using AsyncObjectSerializer.
 * Reconstructs promises and async iterables from their serialized representations.
 *
 * @template TTarget - The expected type of the deserialized object
 *
 * @example
 * ```typescript
 * const serializedStream = new AsyncObjectSerializer({
 *   value: Promise.resolve(42),
 *   stream: (async function*() { yield 1; yield 2; })()
 * });
 *
 * const deserializer = new AsyncObjectDeserializer(serializedStream);
 * const result = await deserializer.deserialize();
 *
 * console.log(await result.value); // 42
 * for await (const num of result.stream) {
 *   console.log(num); // 1, 2
 * }
 * ```
 */
export class AsyncObjectDeserializer<TTarget extends object> {
  private iter: AsyncIterable<object>;
  private deserializedRoot?: TTarget;
  private promises: Map<number, PromiseHandler> = new Map();
  private activeIterators: Map<number, BufferedAsyncIterable> = new Map();

  /**
   * Optional callback that is called when the root object is first deserialized
   */
  onSetRoot?: (root: TTarget) => void;

  /**
   * Creates a new AsyncObjectDeserializer instance
   * @param iter - The async iterable containing serialized object chunks
   */
  constructor(iter: AsyncIterable<object>) {
    this.iter = iter;
  }

  /**
   * Processes the serialized stream and reconstructs the original object
   * with its promises and async iterables
   *
   * @returns Promise<TTarget | undefined> The deserialized object
   */
  async deserialize(): Promise<TTarget | undefined> {
    for await (const serializedChunk of this.iter) {
      if (!this.deserializedRoot) {
        this.deserializedRoot = this.deserializeValue(
          serializedChunk,
        ) as TTarget;
        if (this.onSetRoot) this.onSetRoot(this.deserializedRoot);
        continue;
      }

      const [id, value] = serializedChunk as [number, object];

      const promise = this.promises.get(id);
      if (promise) {
        promise.resolve(Promise.resolve(value));
        this.promises.delete(id);
        continue;
      }

      const iter = this.activeIterators.get(id);
      if (iter) {
        const { done, value: iterValue } = value as {
          done: boolean;
          value: unknown;
        };
        if (done) {
          iter.done();
        } else {
          iter.push(iterValue);
        }
        continue;
      }
    }

    return this.deserializedRoot;
  }

  /**
   * Recursively deserializes a value, reconstructing promises, async iterables,
   * and nested objects from their serialized form
   *
   * @param serializedValue - The serialized value to deserialize
   * @returns The deserialized value
   */
  private deserializeValue<I extends object>(serializedValue: I): unknown {
    const keys = Object.keys(serializedValue);
    if (keys.length === 1) {
      if ("$promise" in serializedValue) {
        const id = (serializedValue as SerializedPromise)["$promise"];
        return new Promise((resolve, reject) => {
          this.promises.set(id, { resolve, reject });
        });
      }

      if ("$asyncIterator" in serializedValue) {
        const id =
          (serializedValue as SerializedAsyncIterator)["$asyncIterator"];
        const iter = new BufferedAsyncIterable();
        this.activeIterators.set(id, iter);
        return iter;
      }
    }

    const dest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(serializedValue)) {
      if (value && typeof value === "object") {
        dest[key] = this.deserializeValue(value as object);
      } else {
        dest[key] = value;
      }
    }
    return dest;
  }
}

/**
 * Helper function to deserialize an object stream and return a promise that
 * resolves with the root object as soon as it's available
 *
 * @template T - The expected type of the deserialized object
 * @param iter - The async iterable containing serialized object chunks
 * @returns Promise<T> A promise that resolves with the deserialized root object
 *
 * @example
 * ```typescript
 * const serializedStream = new AsyncObjectSerializer({
 *   name: "test",
 *   value: Promise.resolve(42)
 * });
 *
 * const obj = await deserialize<{ name: string, value: Promise<number> }>(serializedStream);
 * console.log(obj.name); // "test"
 * console.log(await obj.value); // 42
 * ```
 */
export function deserialize<T extends object>(
  iter: AsyncIterable<object>,
): Promise<T> {
  const deserializer = new AsyncObjectDeserializer<T>(iter);

  return new Promise<T>((resolve) => {
    deserializer.onSetRoot = resolve;
    deserializer.deserialize(); // don't await
  });
}

export default deserialize;
