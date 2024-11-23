import PushableAsyncIterable from "../util/pushableAsyncIterable.ts";

export class ReAssembler<T extends object> {
  iter: AsyncIterable<object>;
  root?: T;
  promises: Map<
    number,
    { resolve: (value: object) => void; reject: (reason?: unknown) => void }
  > = new Map();
  iters: Map<number, PushableAsyncIterable> = new Map();
  onSetRoot?: (root: T) => void;

  constructor(iter: AsyncIterable<object>) {
    this.iter = iter;
  }

  async reassemble() {
    for await (const item of this.iter) {
      // console.log("item", item);

      if (!this.root) {
        this.root = this.resolve(item) as T;
        if (this.onSetRoot) this.onSetRoot(this.root);
        continue;
      }

      const [id, value] = item as [number, object];

      // TODO, let's have one map for both promises and iters

      const promise = this.promises.get(id);
      if (promise) {
        promise.resolve(Promise.resolve(value));
        this.promises.delete(id);
        continue;
      }

      const iter = this.iters.get(id);
      if (iter) {
        const { done, value: thisValue } = value as {
          done: boolean;
          value: unknown;
        };
        if (done) {
          iter.done();
        } else {
          iter.push(thisValue);
        }
        continue;
      }
    }

    return this.root;
  }

  resolve<I extends object>(item: I) {
    const keys = Object.keys(item);
    if (keys.length === 1) {
      if ("$promise" in item) {
        const id = item["$promise"] as number;
        return new Promise((resolve, reject) => {
          this.promises.set(id, { resolve, reject });
        });
      }

      if ("$asyncIterator" in item) {
        const id = item["$asyncIterator"] as number;
        const iter = new PushableAsyncIterable();
        this.iters.set(id, iter);
        return iter;
      }
    }

    const dest = { ...item };
    for (const [key, value] of Object.entries(dest)) {
      // @ts-expect-error: later
      dest[key] = this.resolve(value);
    }
    return dest;
  }
}

export function reassemble<T extends object>(
  iter: AsyncIterable<object>,
) {
  const reassembler = new ReAssembler<T>(iter);

  return new Promise<T>((resolve) => {
    reassembler.onSetRoot = resolve;
    reassembler.reassemble(); // don't await
  });
}

export default reassemble;
