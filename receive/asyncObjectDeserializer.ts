import BufferedAsyncIterable from "../util/bufferedAsyncIterable.ts";

export class AsyncObjectDeserializer<TTarget extends object> {
  private iter: AsyncIterable<object>;
  private deserializedRoot?: TTarget;
  private promises: Map<
    number,
    { resolve: (value: object) => void; reject: (reason?: unknown) => void }
  > = new Map();
  private activeIterators: Map<number, BufferedAsyncIterable> = new Map();
  onSetRoot?: (root: TTarget) => void;

  constructor(iter: AsyncIterable<object>) {
    this.iter = iter;
  }

  async deserialize() {
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

  private deserializeValue<I extends object>(serializedValue: I) {
    const keys = Object.keys(serializedValue);
    if (keys.length === 1) {
      if ("$promise" in serializedValue) {
        const id = serializedValue["$promise"] as number;
        return new Promise((resolve, reject) => {
          this.promises.set(id, { resolve, reject });
        });
      }

      if ("$asyncIterator" in serializedValue) {
        const id = serializedValue["$asyncIterator"] as number;
        const iter = new BufferedAsyncIterable();
        this.activeIterators.set(id, iter);
        return iter;
      }
    }

    const dest = { ...serializedValue };
    for (const [key, value] of Object.entries(dest)) {
      // @ts-expect-error: later
      dest[key] = this.deserializeValue(value);
    }
    return dest;
  }
}

export function deserialize<T extends object>(
  iter: AsyncIterable<object>,
) {
  const deserializer = new AsyncObjectDeserializer<T>(iter);

  return new Promise<T>((resolve) => {
    deserializer.onSetRoot = resolve;
    deserializer.deserialize(); // don't await
  });
}

export default deserialize;
