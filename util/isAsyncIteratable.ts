// deno-lint-ignore no-explicit-any
export default function isAsyncIterable(obj: any) {
  return obj && typeof obj[Symbol.asyncIterator] === "function";
}
