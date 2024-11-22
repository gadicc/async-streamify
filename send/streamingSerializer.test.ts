import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import StreamingSerializer from "./streamingSerializer.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* integers(max = 10, delay = 0) {
  let i = 1;
  while (i <= max) {
    // console.log(`yielding ${i}`);
    yield i++;

    if (delay) await sleep(delay);
  }
}

describe("send/streamingSerializer", () => {
  // https://github.com/denoland/deno/issues/11133#issuecomment-1984925632
  const timeoutMs = 5000;
  let timeoutId: number;
  beforeEach(() => {
    timeoutId = setTimeout(() => {
      throw new Error(`Timed out after ${timeoutMs} ms.`);
    }, timeoutMs);
  });
  afterEach(() => {
    clearTimeout(timeoutId);
  });
  // --- //

  it("handles promises", async () => {
    const obj = new Promise((resolve) => resolve("resolved"));
    const arr = await Array.fromAsync(new StreamingSerializer(obj));
    expect(arr).toEqual([{ "$promise": 1 }, [1, "resolved"]]);
  });

  it("handles async iterators", async () => {
    const arr = await Array.fromAsync(new StreamingSerializer(integers(3)));
    expect(arr).toEqual([
      { "$asyncIterator": 1 },
      [1, { done: false, value: 1 }],
      [1, { done: false, value: 2 }],
      [1, { done: false, value: 3 }],
      [1, { done: true, value: undefined }],
    ]);
  });

  it("handles nested promises, 1 level deep", async () => {
    const obj = {
      a: new Promise((resolve) => resolve("resolved")),
      b: new Promise((resolve) => resolve("resolved")),
    };
    const arr = await Array.fromAsync(new StreamingSerializer(obj));
    expect(arr).toEqual([
      { a: { "$promise": 1 }, b: { "$promise": 2 } },
      [1, "resolved"],
      [2, "resolved"],
    ]);
  });

  it("handles nested async iterators, 1 level deep", async () => {
    const obj = {
      a: integers(3),
      b: integers(3),
    };
    const arr = await Array.fromAsync(new StreamingSerializer(obj));
    expect(arr).toEqual([
      { a: { "$asyncIterator": 1 }, b: { "$asyncIterator": 2 } },
      [1, { done: false, value: 1 }],
      [2, { done: false, value: 1 }],
      [1, { done: false, value: 2 }],
      [2, { done: false, value: 2 }],
      [1, { done: false, value: 3 }],
      [2, { done: false, value: 3 }],
      [1, { done: true, value: undefined }],
      [2, { done: true, value: undefined }],
    ]);
  });

  it("handles nested promises, 2 levels deep", async () => {
    const obj = {
      promise1: new Promise((resolve) =>
        resolve({
          promise2: new Promise((resolve) => resolve("resolved")),
        })
      ),
    };
    const arr = await Array.fromAsync(new StreamingSerializer(obj));
    expect(arr).toEqual([
      { promise1: { "$promise": 1 } },
      [1, { promise2: { "$promise": 2 } }],
      [2, "resolved"],
    ]);
  });
});
