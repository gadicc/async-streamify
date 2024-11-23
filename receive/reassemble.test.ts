import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

import reassamble from "./reassemble.ts";
import { addTimeout } from "../tests/util.ts";

// Async Iterator From Array
function aifa(arr: Array<object>) {
  return (async function* () {
    yield* arr;
  })();
}

describe("receive/reassemble", () => {
  addTimeout(5000);

  it("reassembles promises", async () => {
    // Since resolve() awaits chained promises, we get final value not a promise
    const result = await reassamble(aifa([{ "$promise": 1 }, [1, "resolved"]]));
    expect(result).toBe("resolved");
  });

  /*
    const iter = new PushableAsyncIterable<object>();
    iter.push({ "$promise": 1 });
    const result = await reassamble(iter);
    expect(result).toBeInstanceOf(Promise);
  */

  it("reassembles promises in objects", async () => {
    const result = await reassamble<Record<string, unknown>>(
      aifa([{ promise: { "$promise": 1 } }, [1, "resolved"]]),
    );
    expect(result.promise).toBeInstanceOf(Promise);
    expect(result.promise).resolves.toBe("resolved");
  });

  it("reassembles iterables", async () => {
    const result = await reassamble(
      aifa([
        { "$asyncIterator": 1 },
        [1, { done: false, value: 1 }],
        [1, { done: false, value: 2 }],
        [1, { done: false, value: 3 }],
        [1, { done: true, value: undefined }],
      ]),
    );
    // @ts-expect-error: later
    expect(await Array.fromAsync(result)).toEqual([1, 2, 3]);
  });

  it("reassembles iterables in objects", async () => {
    const result = await reassamble<Record<string, unknown>>(
      aifa([
        { integers: { "$asyncIterator": 1 } },
        [1, { done: false, value: 1 }],
        [1, { done: false, value: 2 }],
        [1, { done: false, value: 3 }],
        [1, { done: true, value: undefined }],
      ]),
    );
    // @ts-expect-error: later
    expect(await Array.fromAsync(result.integers)).toEqual([1, 2, 3]);
  });

  it("reassembles in order", async () => {
    const result = await reassamble<
      { promise: Promise<string>; integers: AsyncIterable<number> }
    >(
      aifa([
        { promise: { "$promise": 1 }, integers: { "$asyncIterator": 2 } },
        [2, { done: false, value: 1 }],
        [1, "resolved"],
        [2, { done: false, value: 2 }],
        [2, { done: false, value: 3 }],
        [2, { done: true, value: undefined }],
      ]),
    );

    const output = [] as unknown[];
    result.promise.then((value) => output.push(value));
    await (async () => {
      for await (const value of result.integers) {
        output.push(value);
      }
    })();

    expect(output).toEqual([1, "resolved", 2, 3]);
  });
});
