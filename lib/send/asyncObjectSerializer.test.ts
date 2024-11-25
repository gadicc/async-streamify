import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import AsyncObjectSerializer from "./asyncObjectSerializer.ts";
import { addTimeout, integers } from "../../tests/util.ts";
import transformIterable from "../util/transformIterable.ts";

describe("send/asyncObjectSerializer", () => {
  addTimeout(5000);

  it("handle regular sync arrays", async () => {
    const arrIn = [1, 2, 3];
    const arrOut = await Array.fromAsync(new AsyncObjectSerializer(arrIn));
    expect(arrOut).toEqual([arrIn]);
  });

  it("handles promises", async () => {
    const obj = new Promise((resolve) => resolve("resolved"));
    const arr = await Array.fromAsync(new AsyncObjectSerializer(obj));
    expect(arr).toEqual([{ "$promise": 1 }, [1, "resolved"]]);
  });

  it("handles async iterators", async () => {
    const arr = await Array.fromAsync(
      new AsyncObjectSerializer(integers(3)),
    );
    expect(arr).toEqual([
      { "$asyncIterator": 1 },
      [1, { done: false, value: 1 }],
      [1, { done: false, value: 2 }],
      [1, { done: false, value: 3 }],
      [1, { done: true, value: undefined }],
    ]);
  });

  it("handle arrays of promises", async () => {
    const arrIn = [Promise.resolve(1), 2, Promise.resolve(3)];
    const arrOut = await Array.fromAsync(new AsyncObjectSerializer(arrIn));
    expect(arrOut).toEqual([
      [{ $promise: 1 }, 2, { $promise: 2 }],
      [1, 1],
      [2, 3],
    ]);
  });

  it("handles nested promises, 1 level deep", async () => {
    const obj = {
      a: new Promise((resolve) => resolve("resolved")),
      b: new Promise((resolve) => resolve("resolved")),
    };
    const arr = await Array.fromAsync(new AsyncObjectSerializer(obj));
    expect(arr).toEqual([
      { a: { "$promise": 1 }, b: { "$promise": 2 } },
      [1, "resolved"],
      [2, "resolved"],
    ]);
  });

  it("handles nested async iterators, 1 level deep", async () => {
    const obj = {
      a: integers(3),
      b: integers(3),
    };
    const arr = await Array.fromAsync(new AsyncObjectSerializer(obj));
    expect(arr).toEqual([
      { a: { "$asyncIterator": 1 }, b: { "$asyncIterator": 2 } },
      [1, { done: false, value: 1 }],
      [2, { done: false, value: 1 }],
      [1, { done: false, value: 2 }],
      [2, { done: false, value: 2 }],
      [1, { done: false, value: 3 }],
      [2, { done: false, value: 3 }],
      [1, { done: true, value: undefined }],
      [2, { done: true, value: undefined }],
    ]);
  });

  it("handles nested promises, 2 levels deep", async () => {
    const obj = {
      promise1: new Promise((resolve) =>
        resolve({
          promise2: new Promise((resolve) => resolve("resolved")),
        })
      ),
    };
    const arr = await Array.fromAsync(new AsyncObjectSerializer(obj));
    expect(arr).toEqual([
      { promise1: { "$promise": 1 } },
      [1, { promise2: { "$promise": 2 } }],
      [2, "resolved"],
    ]);
  });

  it("handles backpressure (single iterators)", async () => {
    const yielded: number[] = [];
    const iterable = transformIterable(integers(3), (value: number) => {
      yielded.push(value);
      return value;
    });

    const serializer = new AsyncObjectSerializer(iterable);

    const _root = await serializer.next();
    expect(yielded).toEqual([]);

    await serializer.next();
    expect(yielded).toEqual([1]);

    await serializer.next();
    expect(yielded).toEqual([1, 2]);
  });

  it.skip("handles backpressure (multiple simultaneous iterators - onWait)", async () => {
    const yielded: number[] = [];
    const received: number[] = [];

    const iterable1 = transformIterable(integers(2), (value: number) => {
      yielded.push(value);
      return value;
    });
    const iterable2 = transformIterable(integers(2), (value: number) => {
      yielded.push(value);
      return value;
    });

    const serializer = new AsyncObjectSerializer({ iterable1, iterable2 });
    const _root = await serializer.next();
    const getNext = async () =>
      received.push((await serializer.next()).value[1].value as number);

    await getNext();
    expect(received).toEqual([1]);
    expect(yielded).toEqual([1, 1]);

    await getNext();
    expect(received).toEqual([1, 1]);
    expect(yielded).toEqual([1, 1]);

    await getNext();
    expect(received).toEqual([1, 1, 2]);
    expect(yielded).toEqual([1, 1, 2, 2]);

    await getNext();
    expect(received).toEqual([1, 1, 2, 2]);
    expect(yielded).toEqual([1, 1, 2, 2]);
  });

  it("handles backpressure (multiple simultaneous iterators - onNext)", async () => {
    const yielded: number[] = [];
    const received: number[] = [];

    const iterable1 = transformIterable(integers(2), (value: number) => {
      yielded.push(value);
      return value;
    });
    const iterable2 = transformIterable(integers(2), (value: number) => {
      yielded.push(value);
      return value;
    });

    const serializer = new AsyncObjectSerializer({ iterable1, iterable2 });
    const _root = await serializer.next();
    const getNext = async () =>
      received.push((await serializer.next()).value[1].value as number);

    await getNext();
    expect(received).toEqual([1]);
    expect(yielded).toEqual([1, 1]);

    await getNext();
    expect(received).toEqual([1, 1]);
    expect(yielded).toEqual([1, 1, 2, 2]);

    await getNext();
    expect(received).toEqual([1, 1, 2]);
    expect(yielded).toEqual([1, 1, 2, 2]);

    await getNext();
    expect(received).toEqual([1, 1, 2, 2]);
    expect(yielded).toEqual([1, 1, 2, 2]);
  });
});
