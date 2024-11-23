// deno run --allow-net server.ts
import { AsyncResponse } from "../index.ts";
import { integers, sleep } from "../tests/util.ts";

const data = () => ({
  promise: sleep(100).then(() => "resolved"),
  integers: integers(10, 200),
});
type dataType = ReturnType<typeof data>;

function handler(_request: Request): Response {
  return new AsyncResponse(data());
}
Deno.serve(handler);

export type { dataType };
