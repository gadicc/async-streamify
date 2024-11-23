import { deserialize } from "./asyncObjectDeserializer.ts";

export function deserializeResponse<T extends object>(
  response: Response,
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function* streamChunks(): AsyncGenerator<object> {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line);
        }
      }
    }

    const remaining = decoder.decode();
    if (remaining.trim()) {
      yield JSON.parse(remaining);
    }
  }

  return deserialize<T>(streamChunks());
}

// alias
export const fromResponse = deserializeResponse;

export default deserializeResponse;
