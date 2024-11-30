import AsyncObjectSerializer from "./asyncObjectSerializer.ts";

export type AsyncObjectSerializerOptions = {
  transformers?: ((value: unknown) => string)[];
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

    const serializer = new AsyncObjectSerializer(body);

    // Create a ReadableStream that serializes the object and encodes it as NDJSON
    const stream = new ReadableStream({
      async start(controller: ReadableStreamDefaultController) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of serializer) {
            const transformed = opts.transformers!.reduce(
              (acc, cur) => acc = cur(acc),
              chunk,
            );

            if (typeof transformed !== "string") {
              throw new Error(
                "Final transformer in array must return a JSON string, not " +
                  typeof transformed + ": " + JSON.stringify(transformed),
              );
            }

            controller.enqueue(encoder.encode(transformed + "\n"));
          }
        } finally {
          controller.close();
        }
      },
    });

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
