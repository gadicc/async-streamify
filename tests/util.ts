import { afterEach, beforeEach } from "@std/testing/bdd";

// https://github.com/denoland/deno/issues/11133#issuecomment-1984925632
export function addTimeout(timeoutMs = 5000) {
  let timeoutId: number;
  beforeEach(() => {
    timeoutId = setTimeout(() => {
      throw new Error(`Timed out after ${timeoutMs} ms.`);
    }, timeoutMs);
  });
  afterEach(() => {
    clearTimeout(timeoutId);
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* integers(max = 10, delay = 0) {
  let i = 1;
  while (i <= max) {
    // console.log(`yielding ${i}`);
    yield i++;

    if (delay) await sleep(delay);
  }
}
