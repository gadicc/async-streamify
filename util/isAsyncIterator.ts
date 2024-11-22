// @Bergi, https://stackoverflow.com/a/70339053/1839099
// deno-lint-ignore no-explicit-any
export default function isAsyncIterator(obj: any) {
  if (Object(obj) !== obj) return false;
  const method = obj[Symbol.asyncIterator];
  if (typeof method != "function") return false;
  const aIter = method.call(obj);
  return aIter === obj;
}
