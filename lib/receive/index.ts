/**
 * @module receive
 *
 * This module provides utilities for deserializing streams back into their original
 * object form, reconstructing promises and async iterables.
 *
 * @example
 * ```typescript
 * import { deserializeResponse, deserialize } from "./receive/index.ts";
 *
 * // Deserializing a Response
 * const response = await fetch("https://api.example.com/stream");
 * const data = await deserializeResponse<{
 *   status: string;
 *   result: Promise<{ done: boolean }>;
 *   updates: AsyncIterable<string>;
 * }>(response);
 *
 * // Using deserialize directly with an async iterable
 * const stream = getStreamSomehow();
 * const data = await deserialize<MyType>(stream);
 * ```
 */

export * from "./response.ts";
export * from "./asyncObjectDeserializer.ts";
