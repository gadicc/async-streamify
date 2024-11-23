export default class BufferedAsyncIterable<T = unknown> {
  private buffer: Array<T> = [];
  private resolvers: Array<(value: IteratorResult<T>) => void> = [];
  protected isDone = false;
  onWait?: () => void;

  push(value: T) {
    this.buffer.push(value);
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver({ value: this.buffer.shift()!, done: false });
    }
  }

  done() {
    this.isDone = true;
    for (const resolver of this.resolvers) {
      resolver({ value: undefined, done: true });
    }
    this.resolvers = [];
  }

  wait() {
    if (this.onWait) this.onWait();
    return new Promise<IteratorResult<T>>((resolve) => {
      if (this.buffer.length) {
        resolve({ value: this.buffer.shift()!, done: false });
      } else if (this.isDone) {
        resolve({ value: undefined, done: true });
      } else {
        this.resolvers.push(resolve);
      }
    });
  }

  pop() {
    return this.buffer.shift();
  }

  [Symbol.asyncIterator]() {
    return {
      next: () => this.wait(),
    };
  }
}
