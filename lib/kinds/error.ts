export type SerializedError = {
  $error: {
    name: string;
    message: string;
    stack?: string;
  };
};

export type Serialized = SerializedError;
export type Native = Error;

export const name = "error";

export function testNative(target: unknown): boolean {
  return target instanceof Error;
}

export function serialize(target: Error): SerializedError {
  /*
    // consider something like: (for additional properties?)
    Object.getOwnPropertyNames(value).forEach(function (propName) {
        error[propName] = value[propName];
    });
    //
  */
  return {
    $error: {
      name: target.name,
      message: target.message,
      stack: target.stack,
    },
  };
}

export function maybeSerialize<T>(target: T): SerializedError | T {
  return testNative(target) ? serialize(target as Error) : target;
}

export function testSerialized(target: unknown): boolean {
  return typeof target === "object" && target !== null &&
    Object.keys(target).length === 1 && "$error" in target;
}

export function deserialize(serialized: SerializedError): Error {
  const $error = serialized.$error;
  const error = new Error($error.message);
  error.name = $error.name;
  if ($error.stack) error.stack = $error.stack;
  return error;
}

export function maybeDeserialize<T>(serialized: T): T | Error {
  return testSerialized(serialized)
    ? deserialize(serialized as SerializedError)
    : serialized;
}
