import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import transformIterable from "./transformIterable.ts";

describe("transformIterable", () => {
  it("transforms an iterable", async () => {
    const iter = transformIterable(
      (async function* () {
        yield* [1, 2, 3];
      })(),
      (item) => item * 2,
    );

    const arr = await Array.fromAsync(iter);
    expect(arr).toEqual([2, 4, 6]);
  });
});
