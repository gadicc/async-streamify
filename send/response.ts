import transformIterable from "../lib/util/transformIterable";
import StreamingSerializer from "./streamingSerializer.ts";

export class AsyncResponse extends Response {
  constructor(body: object | null, init: ResponseInit = {}) {
    if (typeof body !== "object" || body === null) {
      throw new TypeError(
        "AsyncResponse body must be an object (incl. promises and async iterators)",
      );
    }

    if (!init.headers) {
      init.headers = new Headers();
    } else if (!(init.headers instanceof Headers)) {
      init.headers = new Headers(init.headers);
    }
    const headers = init.headers as Headers;

    const existingContentType = headers.get("content-type");
    if (existingContentType) {
      throw new Error(
        "Content-Type header is not allowed in Response constructor",
      );
    }
    headers.set("Content-Type", "application/x-ndjson; charset=utf-8");

    const streamingSerializer = new StreamingSerializer(body);
    const ndJsonStream = transformIterable(
      streamingSerializer,
      (item: object) => JSON.stringify(item) + "\n",
    );

    super(ndJsonStream, init);
  }
}
