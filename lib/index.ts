/**
 * @module async-streamify
 *
 * A library for serializing and deserializing objects containing promises and
 * async iterables into streams, enabling transmission of complex async objects
 * over HTTP or other protocols.
 *
 * The library consists of two main parts:
 * - send: Utilities for serializing objects into streams
 * - receive: Utilities for deserializing streams back into objects
 *
 * Key features:
 * - Serialize promises that resolve over time
 * - Stream async iterables as they produce values
 * - Maintain object structure and relationships
 * - Support for nested promises and async iterables
 * - Built-in Response integration for HTTP scenarios
 *
 * @example
 * ```typescript
 * // Server side
 * import { AsyncResponse } from "./send/index.ts";
 *
 * function handler(req: Request) {
 *   const data = {
 *     status: "processing",
 *     result: Promise.resolve({ done: true }),
 *     updates: (async function*() {
 *       yield "step 1";
 *       yield "step 2";
 *     })()
 *   };
 *
 *   return new AsyncResponse(data);
 * }
 *
 * // Client side
 * import { deserializeResponse } from "./receive/index.ts";
 *
 * const response = await fetch("/api/endpoint");
 * const data = await deserializeResponse<{
 *   status: string;
 *   result: Promise<{ done: boolean }>;
 *   updates: AsyncIterable<string>;
 * }>(response);
 *
 * // Access properties naturally
 * console.log(data.status); // "processing"
 * console.log(await data.result); // { done: true }
 * for await (const update of data.updates) {
 *   console.log(update); // "step 1", "step 2"
 * }
 * ```
 *
 * For lower-level control, you can use the serializer/deserializer directly:
 *
 * ```typescript
 * import { AsyncObjectSerializer, deserialize } from "async-streamify";
 *
 * const obj = {
 *   value: Promise.resolve(42),
 *   stream: (async function*() {
 *     yield 1;
 *     yield 2;
 *   })()
 * };
 *
 * // Serialize
 * const serializer = new AsyncObjectSerializer(obj);
 * for await (const chunk of serializer) {
 *   console.log(chunk);
 * }
 *
 * // Deserialize
 * const stream = getStreamSomehow();
 * const data = await deserialize<typeof obj>(stream);
 * ```
 */

export * from "./send/index.ts";
export * from "./receive/index.ts";
