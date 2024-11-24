/**
 * @module send
 *
 * This module provides utilities for serializing objects containing promises
 * and async iterables into streams that can be transmitted over HTTP or other protocols.
 *
 * @example
 * ```typescript
 * import { AsyncResponse, AsyncObjectSerializer } from "./send/index.ts";
 *
 * // Using AsyncResponse in a server
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
 * // Using AsyncObjectSerializer directly
 * const serializer = new AsyncObjectSerializer(data);
 * for await (const chunk of serializer) {
 *   console.log(chunk);
 * }
 * ```
 */

export * from "./response.ts";
export * from "./asyncObjectSerializer.ts";
