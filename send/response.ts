import AsyncObjectSerializer from "./asyncObjectSerializer.ts";

export class AsyncResponse extends Response {
  constructor(body: object | null, init: ResponseInit = {}) {
    if (body === null) {
      super(null, init);
      return;
    }

    const serializer = new AsyncObjectSerializer(body);
    super(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of serializer) {
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
          }
          controller.close();
        },
      }),
      {
        ...init,
        headers: {
          ...init.headers,
          "content-type": "application/x-ndjson",
        },
      },
    );
  }
}

export default AsyncResponse;
