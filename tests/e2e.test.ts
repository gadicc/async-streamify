import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

import { AsyncResponse, deserializeResponse } from "../lib/index.ts";
import { makeControllablePromise } from "./util.ts";
import BufferedAsyncIterable from "../lib/util/bufferedAsyncIterable.ts";

describe("tests/e2e", () => {
  it("works", async () => {
    const { promise, resolve } = makeControllablePromise<string>();
    const iterable = new BufferedAsyncIterable<number>();

    const data = { promise, iterable };
    const response = new AsyncResponse(data);
    const result = await deserializeResponse<typeof data>(response);

    iterable.push(1);
    resolve("resolved");
    iterable.push(2);
    iterable.push(3);
    iterable.close();

    const output: (string | number)[] = [];
    result.promise.then((value) => output.push(value));

    for await (const value of result.iterable) {
      output.push(value);
    }

    expect(output).toEqual([1, "resolved", 2, 3]);
  });

  it("custom transformers", async () => {
    const data = { a: 1 };
    const response = new AsyncResponse(data, undefined, {
      transformers: [
        (x) => JSON.stringify(x) + "!",
      ],
    });
    const result = await deserializeResponse<typeof data>(response, {
      transformers: [
        (x) => JSON.parse(x.slice(0, -1)),
      ],
    });
    expect(result).toEqual(data);
  });
});
