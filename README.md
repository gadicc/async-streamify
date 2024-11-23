# async-streamify

_Stream / serialize nested promises and async iterables over http, etc_

Copyright (c) 2024 by Gadi Cohen. [MIT Licensed](./LICENSE.txt).

## Features

- [x] Supports promises, async iterators and objects containing them.
- [x] Objects can be (asynchronously!) nested any number of levels deep.
- [x] Results are sent as they become available, while respecting backpressure.
- [x] The client receives actual promises, async iterators, etc.
- [x] Great for sending over HTTP, web workers, and text-based mediums.

Spend less time thinking about how to resolve and send data over HTTP by working
with native promises and async iterators over the wire.

Note: streaming is one way only. Async generators yield as fast as the _stream_
can handle, and not when called on the client. Strictly speaking this means we
are not spec-compliant, but in practice, this is what most people need / want.

## Quick Start

```ts
// deno-fmt-ignore-file

// server.ts
import { AsyncResponse } from "async-streamify";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function* integers(max = 10) { let i=0; while (i<=max) { yield i++; await sleep(200); }}
const data = () => ({ promise: sleep(100).then(()=>"resolved"), integers: integers(10) });

export function GET(request: Request) {
  return new AsyncResponse(data());
}
export type { data };

// client.ts
import { deserializeResponse } from "async-streamify";
import type { data } from "./server.ts";

(async () => {
  const response = await fetch("...");
  const result = await deserializeResponse<data>(response);

  result.promise.then((value) => console.log("value")); // "resolved"

  for await (const integer of result.integers)
    console.log(integer); // 1, 2, 3, 4, 5

  // Full console output in order: 1, "resolved", 2, 3, 4, 5
})();
```
