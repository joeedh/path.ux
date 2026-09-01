import { test, expect } from "vitest";
import { ThumbnailCache, type ThumbSource } from "../scripts/widgets/ui_gallery";

/** Stands in for an `ImageBitmap`, recording whether the cache released it. */
function fakeBitmap(): ThumbSource & { closed: boolean } {
  const bmp = {
    width : 8,
    height: 8,
    closed: false,
    close() {
      bmp.closed = true;
    },
  };
  return bmp as unknown as ThumbSource & { closed: boolean };
}

/** A loader that resolves when the returned `finish` is called, counting its calls. */
function deferredLoader() {
  const state = { calls: 0, finish: undefined as ((src: ThumbSource) => void) | undefined };
  const loader = () => {
    state.calls++;
    return new Promise<ThumbSource>((ok) => {
      state.finish = ok;
    });
  };
  return { state, loader };
}

test("a resolved thumbnail is served without running the loader again", async () => {
  const cache = new ThumbnailCache();
  const bmp = fakeBitmap();
  let calls = 0;

  const load = async () => {
    calls++;
    return bmp;
  };

  expect(await cache.get("a", load)).toBe(bmp);
  expect(await cache.get("a", load)).toBe(bmp);
  expect(calls).toBe(1);
  expect(cache.peek("a")).toBe(bmp);
});

test("concurrent requests for one id share a single load", async () => {
  const cache = new ThumbnailCache();
  const { state, loader } = deferredLoader();
  const bmp = fakeBitmap();

  const first = cache.get("a", loader);
  const second = cache.get("a", loader);

  expect(state.calls).toBe(1);

  state.finish!(bmp);
  expect(await first).toBe(bmp);
  expect(await second).toBe(bmp);
});

test("a failed load is not cached and does not block a retry", async () => {
  const cache = new ThumbnailCache();
  const bmp = fakeBitmap();
  let attempt = 0;

  const load = async () => {
    attempt++;
    if (attempt === 1) {
      throw new Error("decode failed");
    }
    return bmp;
  };

  await expect(cache.get("a", load)).rejects.toThrow("decode failed");
  expect(cache.peek("a")).toBe(undefined);
  expect(await cache.get("a", load)).toBe(bmp);
  expect(attempt).toBe(2);
});

test("eviction drops the oldest entry and releases its bitmap", async () => {
  const cache = new ThumbnailCache(2);
  const a = fakeBitmap();
  const b = fakeBitmap();
  const c = fakeBitmap();

  await cache.get("a", async () => a);
  await cache.get("b", async () => b);
  await cache.get("c", async () => c);

  expect(cache.size).toBe(2);
  expect(cache.peek("a")).toBe(undefined);
  expect(a.closed).toBe(true);
  expect(b.closed).toBe(false);
});

test("peeking an entry makes it the last one evicted", async () => {
  const cache = new ThumbnailCache(2);
  const a = fakeBitmap();
  const b = fakeBitmap();
  const c = fakeBitmap();

  await cache.get("a", async () => a);
  await cache.get("b", async () => b);
  cache.peek("a");
  await cache.get("c", async () => c);

  expect(cache.peek("a")).toBe(a);
  expect(cache.peek("b")).toBe(undefined);
  expect(b.closed).toBe(true);
});

test("ensureCapacity raises the bound and never lowers it", async () => {
  const cache = new ThumbnailCache(2);

  cache.ensureCapacity(5);
  expect(cache.maxEntries).toBe(5);

  cache.ensureCapacity(3);
  expect(cache.maxEntries).toBe(5);
});

test("lowering maxEntries evicts down to the new bound immediately", async () => {
  const cache = new ThumbnailCache(4);
  const a = fakeBitmap();
  const b = fakeBitmap();

  await cache.get("a", async () => a);
  await cache.get("b", async () => b);

  cache.maxEntries = 1;

  expect(cache.size).toBe(1);
  expect(a.closed).toBe(true);
  expect(cache.peek("b")).toBe(b);
});

test("clear releases every held bitmap", async () => {
  const cache = new ThumbnailCache();
  const a = fakeBitmap();
  const b = fakeBitmap();

  await cache.get("a", async () => a);
  await cache.get("b", async () => b);

  cache.clear();

  expect(cache.size).toBe(0);
  expect(a.closed).toBe(true);
  expect(b.closed).toBe(true);
});
