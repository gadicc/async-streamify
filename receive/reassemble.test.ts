import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

import reassamble from "./reassemble.ts";

// Async Iterator From Array
function aifa(arr: Array<object>) {
  return (async function* () {
    yield* arr;
  })();
}

describe("receive/reassemble", () => {
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
});
