import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { AsyncResponse, deserializeResponse } from "../index.ts";

Deno.test("async-streamify e2e", async () => {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  async function* integers(max = 10) {
    let i = 0;
    while (i <= max) {
      yield i++;
      await sleep(200);
    }
  }

  const data = () => ({
    promise: sleep(100).then(() => "resolved"),
    integers: integers(3),
  });

  type Data = ReturnType<typeof data>;

  const response = new AsyncResponse(data());
  const result = await deserializeResponse<Data>(response);

  assertEquals(await result.promise, "resolved");

  const numbers: number[] = [];
  for await (const value of result.integers) {
    numbers.push(value);
  }

  assertEquals(numbers, [0, 1, 2, 3]);
});
