/**
 * Helper functions for `Reponse` types.
 */
import { reassemble } from "./reassemble.ts";

/**
 * Given a `Response` object, stream the response body as NDJSON.
 * @param response
 */
export async function* ndjsonStreamer(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is null");
  }

  let buffer = "";
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() as string;

    for (const line of lines) {
      yield JSON.parse(line);
    }
  }
}

export function fromResponse<T extends object>(response: Response) {
  return reassemble<T>(ndjsonStreamer(response));
}
