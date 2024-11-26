import * as error from "./error.ts";

const kinds = [error];
type SerializedTypes = error.Serialized;
type DeserializedTypes = error.Native;

// TODO, some typescript magic for exact types

export function maybeSerialize<T>(target: T): T | SerializedTypes {
  for (const kind of kinds) {
    if (kind.testNative(target)) {
      return kind.serialize(
        target as Parameters<typeof kind.serialize>[0],
      ) as SerializedTypes;
    }
  }
  return target;
}

export function maybeDeserialize<T>(serialized: T): T | DeserializedTypes {
  for (const kind of kinds) {
    if (kind.testSerialized(serialized)) {
      return kind.deserialize(
        serialized as Parameters<typeof kind.deserialize>[0],
      ) as DeserializedTypes;
    }
  }
  return serialized;
}
