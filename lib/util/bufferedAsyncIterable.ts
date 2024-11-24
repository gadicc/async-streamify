/**
 * A class that implements an async iterable with buffering capabilities.
 * Allows pushing values into a buffer that can be consumed asynchronously.
 *
 * @template T - The type of values stored in the buffer
 *
 * @example
 * ```typescript
 * const buffer = new BufferedAsyncIterable<number>();
 *
 * // Push values
 * buffer.push(1);
 * buffer.push(2);
 * buffer.close(); // Below will keep awaiting until this is called.
 *
 * // Consume values
 * for await (const value of buffer) {
 *   console.log(value); // 1, 2
 * }
 * ```
 */
export default class BufferedAsyncIterable<T = unknown> {
  private buffer: Array<T> = [];
  private resolvers: Array<(value: IteratorResult<T>) => void> = [];
  protected isClosed: boolean = false;

  /**
   * Optional callback that is invoked when a consumer is waiting for values
   */
  onWait?: () => void;

  /**
   * Optional callback that is invoked when a consumer calls `next()`
   */
  onNext?: () => void;

  /**
   * Pushes a new value into the buffer.
   * If there are waiting consumers, the first one will be resolved with this value.
   *
   * @param value - The value to push into the buffer
   * @returns void
   */
  push(value: T): void {
    this.buffer.push(value);
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver({ value: this.buffer.shift()!, done: false });
    }
  }

  /**
   * Marks the iterable as done, resolving all waiting consumers with done=true
   *
   * @returns void
   */
  close(): void {
    this.isClosed = true;
    for (const resolver of this.resolvers) {
      resolver({ value: undefined, done: true });
    }
    this.resolvers = [];
  }

  /**
   * Returns a promise that resolves with the next value in the buffer.
   * If the buffer is empty and not done, the promise will wait for the next push.
   *
   * @returns Promise<IteratorResult<T>>
   */
  next(): Promise<IteratorResult<T>> {
    if (this.onNext) this.onNext();
    return new Promise<IteratorResult<T>>((resolve) => {
      if (this.buffer.length) {
        resolve({ value: this.buffer.shift()!, done: false });
      } else if (this.isClosed) {
        resolve({ value: undefined, done: true });
      } else {
        this.resolvers.push(resolve);
        if (this.onWait) this.onWait();
      }
    });
  }

  /**
   * Implementation of the AsyncIterator interface
   *
   * @returns AsyncIterator<T>
   */
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: this.next.bind(this),
    };
  }
}
