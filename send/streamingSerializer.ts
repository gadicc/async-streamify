import PushableAsyncIterable from "../util/pushableAsyncIterable.ts";
import isAsyncIterator from "../util/isAsyncIterator.ts";

export class StreamingSerializer<T = object> extends PushableAsyncIterable {
  object: T;
  counter: number = 1;
  busyCount: number = 0;
  iters: Array<{
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

  queueNexts() {
    for (let i = 0; i < this.iters.length; i++) {
      const thisIter = this.iters[i];
      const { idx, iter, nextPromise, done } = thisIter;
      if (!done && !nextPromise) {
        thisIter.nextPromise = iter[Symbol.asyncIterator]().next().then(
          (result) => {
            this.push([idx, {
              done: result.done,
              value: this.substitute(result.value),
            }]);
            if (result.done) {
              thisIter.done = true;
              this.unbusy();
            }
            thisIter.nextPromise = undefined;
          },
        );
      }
    }
  }

  constructor(object: T) {
    super();
    this.onWait = this.queueNexts;
    this.object = object;
    this.push(this.substitute(object));
  }

  getCounterIdx() {
    this.busyCount++;
    return this.counter++;
  }

  unbusy() {
    this.busyCount--;
    if (this.busyCount === 0) {
      this.done();
    }
  }

  substitute(object: unknown) {
    if (object instanceof Promise) {
      const idx = this.getCounterIdx();
      object.then((resolved) => {
        this.push([idx, this.substitute(resolved)]);
        this.unbusy();
      });
      return { $promise: idx };
    }

    if (
      typeof object !== "object" || object === null || Array.isArray(object)
    ) {
      return object;
    }

    if (isAsyncIterator(object)) {
      const idx = this.getCounterIdx();
      this.iters.push({
        idx,
        iter: object as AsyncIterable<unknown>,
      });
      return { $asyncIterator: idx };
    }

    const dest = { ...object };
    for (const [key, value] of Object.entries(object)) {
      // @ts-expect-error: later
      dest[key] = this.substitute(value);
    }
    return dest;
  }
}

export default StreamingSerializer;
