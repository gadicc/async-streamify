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
- 🔄 Support for deeply nested async objects
- 🌊 Automatic backpressure handling
- 🎯 Type-safe serialization and deserialization
- 🚀 Native promise and async iterator behavior on the client
- 📦 Zero dependencies
- 🛡️ Works with Deno and Node.js

## Installation

### Deno

```typescript
import {
  AsyncResponse,
  deserializeResponse,
} from "https://deno.land/x/async_streamify/mod.ts";
```

### Node.js

```bash
npm install async-streamify
```

```typescript
import { AsyncResponse, deserializeResponse } from "async-streamify";
```

## Quick Start

### Server

```typescript
import { AsyncResponse } from "async-streamify";

// Helper functions
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function* integers(max = 10) {
  let i = 0;
  while (i <= max) {
    yield i++;
    await sleep(200); // Simulate work
  }
}

// Create an object with mixed async values
const data = () => ({
  status: "processing",
  promise: sleep(100).then(() => "completed"),
  stream: integers(5),
  nested: {
    deepPromise: Promise.resolve("I'm deep!"),
    deepStream: integers(3),
  },
});

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

### Client

```typescript
import { deserializeResponse } from "async-streamify";
import type { data } from "./server";

const response = await fetch("http://localhost:8000");
const result = await deserializeResponse<ReturnType<typeof data>>(response);

// Values are received as they become available
console.log(result.status); // "processing" (immediate)

result.promise.then((value) => {
  console.log(value); // "completed" (after 100ms)
});

// Streams work naturally
for await (const num of result.stream) {
  console.log(num); // 0, 1, 2, 3, 4, 5 (every 200ms)
}

// Nested values maintain their async behavior
console.log(await result.nested.deepPromise); // "I'm deep!"
for await (const num of result.nested.deepStream) {
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
  // and terminated with a newline for NDJSON format
}

const deserializedData = await deserialize<typeof data>(receivedStream);
```

## How It Works

1. The server serializes objects into a stream of NDJSON chunks
2. Each chunk contains either resolved values or references to pending async
   operations
3. Values are transmitted as soon as they become available
4. The client reconstructs the object structure, maintaining async behaviors
5. Backpressure is handled automatically through the streaming interface

## Protocol Details

The library uses NDJSON (Newline Delimited JSON) as its transport format. Each
chunk is a valid JSON object terminated by a newline character. This format is:

- Streamable: Each chunk can be processed independently
- Self-delimiting: The newline character provides natural message boundaries
- Human-readable: Easy to debug and inspect
- Widely supported: Works with any text-based transport

## Limitations

- Async generators on the client yield as fast as the stream can handle, not
  when explicitly requested
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
