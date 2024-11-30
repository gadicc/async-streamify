# async-streamify

_Stream and serialize nested promises and async iterables over HTTP, workers,
etc_

[![NPM Version](https://img.shields.io/npm/v/async-streamify?logo=npm)](https://www.npmjs.com/package/async-streamify)
[![JSR](https://jsr.io/badges/@gadicc/async-streamify)](https://jsr.io/@gadicc/async-streamify)
[![JSR Score](https://jsr.io/badges/@gadicc/async-streamify/score)](https://jsr.io/@gadicc/async-streamify)
![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/gadicc/async-streamify/release.yml)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/gadicc/0dce97d506b630be1f1d601a9906de5c/raw/async-streamify-lcov-coverage.json)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

`async-streamify` enables seamless transmission of complex async objects
(including promises and async iterators) over HTTP and other text-based
protocols, while maintaining their async behavior on the receiving end.

## Features

- ✨ Stream promises and async iterators as they resolve/yield
- 🚀 Receive native promises and async iterables on the client
- 🔄 Support for deeply nested async objects (iterable in a promise, etc)
- 🎯 Type-safe serialization and deserialization
- 🌊 Automatic backpressure handling
- 📦 Zero dependencies
- 🛡️ Works in all modern runtimes (browser, bun, deno, node, edge).

## Installation

- From [npm](https://www.npmjs.com/package/async-streamify) with `bun add` |
  `deno add` | `npm install` | `pnpm add` | `yarn add` and `async-streamify`.
- From [jsr](https://jsr.io/@gadicc/async-streamify) with `deno` | `npx jsr` |
  `yarn dlx jsr` | `pnpm dlx jsr` | `bunx jsr` and
  `add gadicc:@async-streamify`.

## Quick Start

**`server.ts`**

```typescript
import { AsyncResponse } from "async-streamify";

// Helper functions; integers() generates a new integer every 200ms.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)); // deno-fmt-ignore
async function* integers(max=10) { let i=0; while (i <= max) { yield i++; await sleep(200); }}

// Create an object with mixed async values
const data = () => ({
  availability: "immediate",
  promise: sleep(100).then(() => "completed"),
  stream: integers(3),
  nested: {
    iteratorInPromise: sleep(100).then(() => integers(3)),
  },
});
export type data = typeof data;

// HTTP handler
export function handler(request: Request) {
  return new AsyncResponse(data(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache", // Recommended for streaming responses
    },
  });
}
```

**`client.ts`**

```typescript
import { deserializeResponse } from "async-streamify";
import type { data } from "./server";

const response = await fetch("http://localhost:8000");
const result = await deserializeResponse<ReturnType<data>>(response);

// Values are received as they become available
console.log(result.availability); // "immediate"

result.promise.then((value) => {
  console.log(value); // "completed" (after 100ms + network latency)
});

// Async iterators retain their native behaviour
for await (const num of result.stream) {
  console.log(num); // 0, 1, 2, 3 (streamed every 200ms)
}

// Nested values work and stream as they resolve
for await (const num of (await result.nested.iteratorInPromise)) {
  console.log(num); // 0, 1, 2, 3
}
```

## API Reference

### `AsyncResponse`

Creates a streaming response that serializes an object containing promises and
async iterables. The response is streamed as newline-delimited JSON (NDJSON).

```typescript
new AsyncResponse(data: any, init?: ResponseInit)
```

Parameters:

- `data`: The object to serialize and stream. Can contain promises, async
  iterables, and nested objects.
- `init`: Standard `ResponseInit` options. The response will automatically set:
  - `Content-Type: application/x-ndjson`
  - Additional headers can be provided through `init.headers`

### `deserializeResponse`

Deserializes a streaming response back into an object with promises and async
iterables.

```typescript
deserializeResponse<T>(response: Response): Promise<T>
```

### Low-level API

For more control, you can use the serializer/deserializer directly:

```typescript
import { AsyncObjectSerializer, deserialize } from "async-streamify";

const serializer = new AsyncObjectSerializer(data);
for await (const chunk of serializer) {
  // Send chunks over your transport
  // Each chunk is a JSON object that should be serialized
}

const deserializedData = await deserialize<typeof data>(receivedStream);
```

For a full implementation example (for Response types with NDSON), see
[send/response.ts](./lib/send/response.ts) and
[receive/response.ts](./lib/receive/response.ts).

## How It Works

1. The server serializes objects into a stream objects that contains either
   resolved values or references to pending async operations.
2. Values are transmitted as soon as they become available (provided the stream
   is ready for more, i.e., backpressure handling).
3. The `AsyncResponse` and `deserializeResponse` helpers further serialize via
   NDJSON (Newline Deliminited JSON) for HTTP streaming.
4. The client "reassembles" the stream back into native objects, promises, async
   iterables.

## Protocol Details

The serialized stream consists of the original root object on the first line,
with any async instances being substituted with a unique index and being
resolved on future lines with `[idx, value]`, i.e.:

```typescript
const object = { promise: sleep(100).then("resolved"; integers: integers(2) };
console.log(await Array.fromAsync(new AsyncObjectSerializer(object)));
[
  { promise: { $promise: 1 }, integers: { $asyncIterable: 2 } },
  [ 1, { $resolve: "resolved" } ],
  [ 2, { value: 0, done: false }],
  [ 2, { value: 1, done: false }],
  [ 2, { value: 2, done: false }],
  [ 2, { value: undefined, done: true }],
]
```

## Limitations

- Async generators on the client yield as fast as the stream can handle, not
  when explicitly requested on the client.
- Because of how **promise chains** work, if you provide a promise as the only
  item to serialize, if you call `await reassemble(...)` you'll get the result
  or thrown error back, not a promise. To work around, simply nest it, e.g.
  `{ promise: new Promise() }`.
- Errors in promise rejections are (de-serialized), and `error instanceof Error`
  works. But obviously instances of custom errors cannot be sent over the wire,
  so instead check if `error.name === "CustomError"` vs
  ~~`error instanceof CustomError`~~, etc.
- Errors in async generators are not handled yet (TODO)
- Circular references are not supported
- WebSocket and bi-directional streaming are not currently supported
- The transport must support streaming and handle backpressure correctly

## TypeScript Support

The library is written in TypeScript and provides full type safety. Use the
generic parameter in `deserializeResponse<T>` to ensure type-safe
deserialization:

```typescript
interface MyData {
  promise: Promise<string>;
  stream: AsyncIterable<number>;
}

const data = await deserializeResponse<MyData>(response);
// data is fully typed
```

## License

Copyright (c) 2024 by Gadi Cohen. [MIT Licensed](./LICENSE.txt).
