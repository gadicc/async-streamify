/**
 * Example server demonstrating async-streamify usage
 *
 * This example creates a simple HTTP server that streams an object containing:
 * - A promise that resolves after 100ms
 * - An async iterator that yields integers with delays
 *
 * To run:
 * ```bash
 * deno run --allow-net server.ts
 * ```
 *
 * Then in another terminal or browser:
 * ```typescript
 * const response = await fetch("http://localhost:8000");
 * const data = await deserializeResponse<dataType>(response);
 *
 * console.log(await data.promise); // "resolved"
 * for await (const num of data.integers) {
 *   console.log(num); // 0, 1, 2, ...
 * }
 * ```
 */

import { AsyncResponse } from "../index.ts";
import { integers, sleep } from "../tests/util.ts";

/**
 * Creates a data object containing async values
 * @returns An object with a promise and an async iterator
 */
const data = () => ({
  promise: sleep(100).then(() => "resolved"),
  integers: integers(10, 200), // yields 10 integers with 200ms delay between each
});

/**
 * Type of the data object for use in type-safe deserialization
 */
type dataType = ReturnType<typeof data>;

/**
 * Request handler that creates and returns an AsyncResponse
 * @param _request The incoming request (unused)
 * @returns Response A streaming response containing the serialized data
 */
function handler(_request: Request): Response {
  return new AsyncResponse(data(), {
    headers: {
      "Access-Control-Allow-Origin": "*", // Enable CORS for testing
    },
  });
}

// Start the server on the default port (8000)
Deno.serve(handler);

// Export the data type for use in clients
export type { dataType };
