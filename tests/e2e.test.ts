import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

import { AsyncResponse, fromResponse } from "../index.ts";
import { addTimeout, integers, sleep } from "./util.ts";

function pipe<T extends object>(object: T) {
  const response = new AsyncResponse(object);
  return fromResponse<T>(response);
}

describe("end-to-end tests", () => {
  addTimeout(5000);

  it("works", async () => {
    const object = { a: Promise.resolve("resolved") };
    const result = await pipe(object);
    expect(result.a).resolves.toBe("resolved");
  });

  it("streams in expected order", async () => {
    const data = {
      // Examples from README, TODO: mock timers
      promise: sleep(10).then(() => "resolved"),
      integers: integers(3, 20),
    };

    const result = await pipe(data);

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
