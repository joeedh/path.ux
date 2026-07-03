import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  DataAPI,
  clearPathWatchers,
  flushPathNotifications,
  getPathWatchStats,
  PathWatchInfo,
} from "../scripts/path-controller/controller/controller";
import { Vector3 } from "../scripts/path-controller/util/vectormath";

class Brush {
  size = 1.0;
  color = new Vector3([1, 0, 0]);
  name = "default";
}

class Root {
  brush = new Brush();
}

function makeAPI() {
  const api = new DataAPI();

  const brushDef = api.mapStruct(Brush);
  brushDef.float("size", "size");
  brushDef.vec3("color", "color");
  brushDef.string("name", "name");

  const rootDef = api.mapStruct(Root);
  rootDef.struct("brush", "brush", "Brush", brushDef);

  api.rootContextStruct = rootDef;

  const root = new Root();
  return { api, root };
}

/* the registry is module-global state; isolate each test */
beforeEach(() => {
  clearPathWatchers();
});

afterEach(() => {
  vi.useRealTimers();
});

type Call = { value: unknown; info: PathWatchInfo };

function record(calls: Call[]) {
  return (value: unknown, info: PathWatchInfo) => calls.push({ value, info });
}

test("push: a value change fires the callback once, with the new value", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.size", record(calls));

  /* subscription primes an initial delivery */
  flushPathNotifications();
  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe(1);
  expect(calls[0].info.resolved).toBe(true);

  api.setValue(root as any, "brush.size", 2.5);
  flushPathNotifications();

  expect(calls.length).toBe(2);
  expect(calls[1].value).toBe(2.5);
  expect(calls[1].info.source).toBe("push");

  /* no change → no callback */
  flushPathNotifications();
  expect(calls.length).toBe(2);
});

test("coalescing: 1000 sets produce one callback", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.size", record(calls));
  flushPathNotifications();
  calls.length = 0;

  for (let i = 0; i < 1000; i++) {
    api.setValue(root as any, "brush.size", i);
  }

  flushPathNotifications();

  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe(999);
});

test("poll: in-place vector mutation is detected", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  const w = api.watch(root as any, "brush.color", record(calls));
  flushPathNotifications();
  calls.length = 0;

  /* raw mutation, bypassing setValue — invisible to push */
  root.brush.color[0] = 0.5;

  expect(w.poll()).toBe(true);
  expect(calls.length).toBe(1);
  expect(Array.from(calls[0].value as Vector3)).toEqual([0.5, 0, 0]);
  expect(calls[0].info.source).toBe("poll");

  /* stable value → poll stays quiet */
  expect(w.poll()).toBe(false);
  expect(calls.length).toBe(1);
});

test("push: whole-vector set through the api is detected", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.color", record(calls));
  flushPathNotifications();
  calls.length = 0;

  api.setValue(root as any, "brush.color", new Vector3([0, 1, 0]));
  flushPathNotifications();

  expect(calls.length).toBe(1);
  expect(Array.from(calls[0].value as Vector3)).toEqual([0, 1, 0]);
});

test("unsubscribe stops callbacks and prunes the registry", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  const baseline = getPathWatchStats();
  const w = api.watch(root as any, "brush.size", record(calls));
  flushPathNotifications();
  calls.length = 0;

  expect(getPathWatchStats().pathRefs).toBe(baseline.pathRefs + 1);

  w.remove();

  api.setValue(root as any, "brush.size", 100);
  flushPathNotifications();
  expect(w.poll()).toBe(false);

  expect(calls.length).toBe(0);
  expect(getPathWatchStats().pathRefs).toBe(baseline.pathRefs);
  expect(getPathWatchStats().propRefs).toBe(baseline.propRefs);
});

test("type-scoped notify (updateChanged) wakes watchers by resolved prop", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.size", record(calls));
  flushPathNotifications();
  calls.length = 0;

  /* raw mutation + type-scoped wake: the updateChanged<T>("size") case
   * (the typed wrapper erases to exactly this call) */
  root.brush.size = 42;
  api.notifyChange(undefined, "size");
  flushPathNotifications();

  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe(42);

  /* a notify for an unrelated prop does not wake it */
  root.brush.size = 43;
  api.notifyChange(undefined, "name");
  flushPathNotifications();
  expect(calls.length).toBe(1);
});

test("subtree overlap: notifying a parent path wakes child-path watchers", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.size", record(calls));
  flushPathNotifications();
  calls.length = 0;

  root.brush.size = 7;
  api.notifyChange("brush");
  flushPathNotifications();

  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe(7);
});

test("global notify() bumps the epoch and wakes everything", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.name", record(calls));
  flushPathNotifications();
  calls.length = 0;

  root.brush.name = "changed";
  api.notifyChange();
  flushPathNotifications();

  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe("changed");
});

test("poll mode matches push mode", () => {
  const { api, root } = makeAPI();
  const pushCalls: Call[] = [];
  const pollCalls: Call[] = [];

  api.watch(root as any, "brush.size", record(pushCalls));
  const poller = api.watch(root as any, "brush.size", record(pollCalls));
  flushPathNotifications();
  pushCalls.length = pollCalls.length = 0;

  api.setValue(root as any, "brush.size", 3);
  flushPathNotifications(); /* drives push watcher; poller's diff also runs */
  poller.tick();

  expect(pushCalls.length).toBe(1);
  expect(pollCalls.length).toBe(1);
  expect(pollCalls[0].value).toBe(pushCalls[0].value);
});

test("immediate debounce fires synchronously inside setValue", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.size", record(calls), { debounce: "immediate" });
  calls.length = 0; /* immediate prime already fired */

  api.setValue(root as any, "brush.size", 9);
  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe(9);
});

test("trailing debounce coalesces onto the trailing edge", () => {
  vi.useFakeTimers();

  const { api, root } = makeAPI();
  const calls: Call[] = [];

  const w = api.watch(root as any, "brush.size", record(calls), {
    debounce: { trailing: 50 },
  });
  flushPathNotifications();
  vi.advanceTimersByTime(100); /* let the prime timer fire */
  calls.length = 0;

  api.setValue(root as any, "brush.size", 1.5);
  flushPathNotifications();
  expect(calls.length).toBe(0); /* timer armed, not fired */

  vi.advanceTimersByTime(30);
  api.setValue(root as any, "brush.size", 2.5);
  flushPathNotifications(); /* restarts the timer */

  vi.advanceTimersByTime(30);
  expect(calls.length).toBe(0);

  vi.advanceTimersByTime(30);
  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe(2.5);

  w.remove();
});

test("unresolved path reads as undefined with resolved: false", () => {
  const { api, root } = makeAPI();
  const calls: Call[] = [];

  api.watch(root as any, "brush.bad.path", record(calls));
  flushPathNotifications();

  expect(calls.length).toBe(1);
  expect(calls[0].value).toBe(undefined);
  expect(calls[0].info.resolved).toBe(false);
});
