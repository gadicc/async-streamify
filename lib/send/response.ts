import AsyncObjectSerializer from "./asyncObjectSerializer.ts";
import transformIterable from "../util/transformIterable.ts";

export type AsyncObjectSerializerOptions = {
  // deno-lint-ignore no-explicit-any
  transformers?: ((value: unknown) => any)[];
};

/**
 * Extends the standard Response class to support streaming serialized objects
 * using AsyncObjectSerializer. The response is formatted as newline-delimited JSON (NDJSON).
 *
 * @example
 * ```typescript
 * // In a server handler
 * async function handler(req: Request) {
 *   const data = {
 *     status: "processing",
 *     result: Promise.resolve({ completed: true }),
 *     updates: (async function*() {
 *       yield "step 1";
 *       yield "step 2";
 *     })()
 *   };
 *
 *   return new AsyncResponse(data, {
 *     headers: {
 *       "cache-control": "no-cache"
 *     }
 *   });
 * }
 * ```
 */
export class AsyncResponse extends Response {
  /**
   * Creates a new AsyncResponse instance
   *
   * @param body - The object to serialize and stream, or null for an empty response
   * @param init - Standard ResponseInit options
   */
  constructor(
    body: object | null,
    init: ResponseInit = {},
    opts: AsyncObjectSerializerOptions = {},
  ) {
    if (body === null) {
      super(null, init);
      return;
    }

    if (!opts.transformers) {
      opts.transformers = [JSON.stringify];
    }

    // This final transformer add newlines (for NDJSON) and encodes to bytes
    const encoder = new TextEncoder();
    opts.transformers.push((value) => encoder.encode(value + "\n"));

    const transform = (chunk: unknown) =>
      opts.transformers!.reduce(
        (acc, cur) => acc = cur(acc),
        chunk,
      ) as Uint8Array;

    const serializer = new AsyncObjectSerializer(body);

    const stream = ReadableStream.from(
      transformIterable(serializer, transform),
    );

    // Initialize the response with the stream and NDJSON content type
    super(
      stream,
      {
        ...init,
        headers: {
          ...init.headers,
          "content-type": "application/x-ndjson",
          // consider: "cache-control": "no-cache", // Recommended for streaming responses
        },
      },
    );
  }
}

export default AsyncResponse;
