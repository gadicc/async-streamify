import { deserialize } from "./asyncObjectDeserializer.ts";

/**
 * Deserializes a streaming NDJSON response into its original object form,
 * reconstructing promises and async iterables.
 *
 * @template T - The expected type of the deserialized object
 * @param response - The Response object containing the serialized NDJSON stream
 * @returns Promise<T> - A promise that resolves with the deserialized object
 *
 * @example
 * ```typescript
 * // Fetching and deserializing a response
 * const response = await fetch("https://api.example.com/stream");
 * const data = await deserializeResponse<{
 *   status: string;
 *   result: Promise<{ completed: boolean }>;
 *   updates: AsyncIterable<string>;
 * }>(response);
 *
 * console.log(data.status); // "processing"
 * console.log(await data.result); // { completed: true }
 * for await (const update of data.updates) {
 *   console.log(update); // "step 1", "step 2"
 * }
 * ```
 */
export function deserializeResponse<T extends object>(
  response: Response,
  // deno-lint-ignore no-explicit-any
  opts: { transformers?: ((value: any) => object)[] } = {},
): Promise<T> {
  if (!response.body) {
    throw new Error("Response body is null");
  }

  if (!opts.transformers) {
    opts.transformers = [JSON.parse];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function transform(chunk: unknown) {
    const transformed = opts.transformers!.reduce(
      (acc, cur) => acc = cur(acc),
      chunk,
    ) as object;
    return transformed;
  }

  /**
   * Generator that reads the response stream and yields parsed JSON objects
   * Handles buffering of partial chunks and NDJSON parsing
   */
  async function* streamChunks(): AsyncGenerator<object, void, unknown> {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            yield transform(line);
          }
        }
      }

      const remaining = decoder.decode();
      if (remaining.trim()) {
        console.log("remainig");
        yield transform(remaining);
      }
    } finally {
      reader.releaseLock();
    }
  }

  return deserialize<T>(streamChunks());
}

/**
 * Alias for deserializeResponse
 * @template T - The expected type of the deserialized object
 */
export const fromResponse = deserializeResponse;

export default deserializeResponse;
