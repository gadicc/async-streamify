# async-streamify

_Stream / serialize nested promises and async iterables over http, etc_

Copyright (c) 2024 by Gadi Cohen. [MIT Licensed](./LICENSE.txt).

## Features

- [x] Supports promises, async iterators and objects containing them.
- [x] Objects can be (asynchronusly!) nested any number of levels deep.
- [x] Results are sent as they become available, while respecting backpressure.
- [x] The client receives actual promises, async iterators, etc.
- [x] Great for sending over HTTP, web workers, and text-based mediums.

Spend less time thinking about how to resolve and send data over HTTP by working
with native promises and async iterators over the wire.

## Quick Start

**server.ts**

```ts
import { AsyncResponse } from "@gadicc/async-streamify/send";

// Hand this over to the the framework of your choice
export function GET(request: Request) {
  const object = {
    promise: new Promise((resolve) => resolve("resolved")),
    iterable: integers(5), // generator yielding 1, 2, 3, 4, 5,
    nested: {
      // nested promise returning a nested async iterable
      integersPromise: new Promise((resolve) => { integers: resolve(integers(5)) });
    }
  }

  // Sugar to return a new `Response` with correct headers and types;
  // see docs for more control.
  return new AsyncResponse(object);
}
```

**client.ts**

```ts
import { reassembleResponse } from "@gadicc/async-streamify/receive";

(async() {
  const response = await fetch("...");
  const result = await reassembleResponse(response);

  // { promise: Promise, iterable: AsyncIterable, nested: { integersPromise: Promise } }
  result;

  await result.promise; // "resolved"
  await Array.fromAsync(result.iterable); // [1, 2, 3, 4, 5];

  const integers = await result.nested.integersPromise;  
  for await (const integer of integers)
    console.log(integer); // 1, 2, 3, 4, 5
})();
```
