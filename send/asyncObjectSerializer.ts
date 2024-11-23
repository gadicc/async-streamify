import BufferedAsyncIterable from "../util/bufferedAsyncIterable.ts";
import isAsyncIterable from "../util/isAsyncIteratable.ts";

export class AsyncObjectSerializer<TSource = object>
  extends BufferedAsyncIterable {
  private sourceObject: TSource;
  private serializationIdCounter: number = 1;
  private activeAsyncOperations: number = 0;
  private activeIterators: Array<{
    idx: number;
    iter: AsyncIterable<unknown>;
    nextPromise?: Promise<
      | void
      | IteratorYieldResult<unknown>
      | IteratorReturnResult<unknown>
      | undefined
    >;
    done?: boolean;
  }> = [];

  scheduleIteratorUpdates() {
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

  constructor(object: TSource) {
    super();
    this.onWait = this.scheduleIteratorUpdates;
    this.sourceObject = object;
    this.push(this.serializeValue(object));
  }

  private getNextSerializationId() {
    this.activeAsyncOperations++;
    return this.serializationIdCounter++;
  }

  private decrementActiveCount() {
    this.activeAsyncOperations--;
    if (this.activeAsyncOperations === 0) {
      this.done();
    }
  }

  private serializeValue(value: unknown) {
    if (value instanceof Promise) {
      const idx = this.getNextSerializationId();
      value.then((resolved) => {
        this.push([idx, this.serializeValue(resolved)]);
        this.decrementActiveCount();
      });
      return { $promise: idx };
    }

    if (
      typeof value !== "object" || value === null || Array.isArray(value)
    ) {
      return value;
    }

    if (isAsyncIterable(value)) {
      const idx = this.getNextSerializationId();
      this.activeIterators.push({
        idx,
        iter: value as AsyncIterable<unknown>,
      });
      return { $asyncIterator: idx };
    }

    const dest = { ...value };
    for (const [key, val] of Object.entries(value)) {
      // @ts-expect-error: later
      dest[key] = this.serializeValue(val);
    }
    return dest;
  }
}

export default AsyncObjectSerializer;
