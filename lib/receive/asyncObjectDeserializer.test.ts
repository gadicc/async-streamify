import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

import reassemble from "./asyncObjectDeserializer.ts";
import { addTimeout } from "../../tests/util.ts";
import isAsyncIterable from "../util/isAsyncIteratable.ts";

// Async Iterator From Array
function aifa(arr: Array<object>) {
  return (async function* () {
    yield* arr;
  })();
}

describe("receive/asyncObjectDeserializer", () => {
  addTimeout(5000);

  it("handle regular sync arrays", async () => {
    const result = await reassemble(aifa([[1, 2, 3]]));
    expect(result).toEqual([1, 2, 3]);
  });

  it("reassembles promises", async () => {
    // Since resolve() awaits chained promises, we get final value not a promise
    const result = await reassemble(
      aifa([{ "$promise": 1 }, [1, { $resolve: "resolved" }]]),
    );
    expect(result).toBe("resolved");
  });

  it("reassembles promise rejections (instanceof Error)", async () => {
    // To avoid resolution of chain, this must be nested
    const result = await reassemble<{ promise: Promise<unknown> }>(aifa([
      { promise: { "$promise": 1 } },
      [1, {
        $reject: {
          $error: {
            name: "Error",
            message: "rejected",
            stack: "blah\nblah",
          },
        },
      }],
    ]));

    await expect(result.promise).rejects.toThrow("rejected");
  });

  it("reassembles promise rejections (non-error)", async () => {
    // To avoid resolution of chain, this must be nested
    const result = await reassemble<{ promise: Promise<unknown> }>(aifa(
      [{ promise: { "$promise": 1 } }, [1, { $reject: "rejected" }]],
    ));
    expect(result.promise).rejects.toBe("rejected");
  });

  /*
    const iter = new PushableAsyncIterable<object>();
    iter.push({ "$promise": 1 });
    const result = await reassemble(iter);
    expect(result).toBeInstanceOf(Promise);
  */

  it("reassembles promises in objects", async () => {
    const result = await reassemble<Record<string, unknown>>(
      aifa([{ promise: { "$promise": 1 } }, [1, { $resolve: "resolved" }]]),
    );
    expect(result.promise).toBeInstanceOf(Promise);
    expect(result.promise).resolves.toBe("resolved");
  });

  it("reassembles arrays of promises", async () => {
    const result = await reassemble<Array<number | Promise<number>>>(aifa([
      [{ $promise: 1 }, 2, { $promise: 2 }],
      [1, { $resolve: 1 }],
      [2, { $resolve: 3 }],
    ]));

    expect(result[0]).resolves.toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).resolves.toBe(3);
  });

  it("reassembles iterables", async () => {
    const result = await reassemble(
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
    const result = await reassemble<Record<string, unknown>>(
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

  it("reassembles async iterators nested inside a promise", async () => {
    const result = await reassemble<Promise<AsyncIterable<number>>>(
      aifa([
        { "$promise": 1 },
        [1, { $resolve: { "$asyncIterator": 2 } }],
        [2, { done: false, value: 1 }],
        [2, { done: false, value: 2 }],
        [2, { done: false, value: 3 }],
        [2, { done: true, value: undefined }],
      ]),
    );

    console.log("result", result);
    expect(isAsyncIterable(result)).toBe(true);
  });

  it("reassembles in order", async () => {
    const result = await reassemble<
      { promise: Promise<string>; integers: AsyncIterable<number> }
    >(
      aifa([
        { promise: { "$promise": 1 }, integers: { "$asyncIterator": 2 } },
        [2, { done: false, value: 1 }],
        [1, { $resolve: "resolved" }],
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
