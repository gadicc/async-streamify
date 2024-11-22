export default class PushableAsyncIterable<T = unknown> {
  queue = [] as T[];
  waitingPromise = null as null | Promise<void>;
  waitingPromiseResolve = null as null | (() => void);
  finished = false;
  onWait?: () => void;

  push(value: T) {
    this.queue.push(value);
    if (this.waitingPromiseResolve) {
      this.waitingPromiseResolve();
    }
  }

  done() {
    this.finished = true;
    if (this.waitingPromiseResolve) this.waitingPromiseResolve();
  }

  async wait() {
    if (!this.waitingPromise) {
      this.waitingPromise = new Promise<void>((resolve) => {
        this.waitingPromiseResolve = () => {
          this.waitingPromise = null;
          this.waitingPromiseResolve = null;
          resolve();
        };
      });
    }

    if (this.onWait) this.onWait();
    return await this.waitingPromise;
  }

  pop() {
    return this.queue.shift();
  }

  async *[Symbol.asyncIterator]() {
    while (true) {
      if (this.queue.length) {
        yield this.pop();
      } else {
        if (this.finished) break;
        await this.wait();
        if (this.queue.length === 0) break;
      }
    }
  }
}
