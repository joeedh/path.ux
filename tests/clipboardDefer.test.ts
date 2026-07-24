import { test, expect, vi, beforeEach, afterEach } from "vitest";

/* config/const.ts starts the system-clipboard reader as an import side effect,
 * so each case re-imports it after installing its own stubs. */

interface ClipboardStubs {
  read: ReturnType<typeof vi.fn>;
  status: { state: PermissionState };
  fireChange: () => void;
}

let current: ClipboardStubs | undefined = undefined;

function installStubs(state: PermissionState): ClipboardStubs {
  const read = vi.fn(() => Promise.resolve([]));
  const listeners: Array<() => void> = [];
  const status = {
    state,
    addEventListener(_type: string, cb: () => void) {
      listeners.push(cb);
    },
  };

  Object.defineProperty(navigator, "clipboard", { value: { read }, configurable: true });
  Object.defineProperty(navigator, "permissions", {
    value       : { query: () => Promise.resolve(status) },
    configurable: true,
  });
  document.hasFocus = () => true;

  current = { read, status, fireChange: () => listeners.forEach((cb) => cb()) };
  return current;
}

/** Lets the module's permission query and its `.then` chain settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

async function importConst(): Promise<void> {
  vi.resetModules();
  await import("../scripts/config/const");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  /* window is shared across the re-imports, so drain this instance's one-shot
   * gesture listener and stop its poller — otherwise it reacts to the next
   * test's events and reads through the next test's stubs. */
  window.dispatchEvent(new Event("load"));
  window.dispatchEvent(new Event("pointerdown"));
  await flush();

  if (current) {
    current.status.state = "denied";
    current.fireChange();
    current = undefined;
  }

  vi.useRealTimers();
});

test("no clipboard access before the user interacts with the page", async () => {
  const { read } = installStubs("prompt");

  await importConst();
  window.dispatchEvent(new Event("load"));
  await flush();
  vi.advanceTimersByTime(2000);
  await flush();

  expect(read).not.toHaveBeenCalled();
});

test("a gesture raises the prompt once, and polling waits for the answer", async () => {
  const stubs = installStubs("prompt");

  await importConst();
  window.dispatchEvent(new Event("load"));
  window.dispatchEvent(new Event("pointerdown"));
  await flush();

  // The single read inside the gesture is what raises the permission prompt.
  expect(stubs.read).toHaveBeenCalledTimes(1);

  // Unanswered (still "prompt"), so nothing polls.
  vi.advanceTimersByTime(2000);
  await flush();
  expect(stubs.read).toHaveBeenCalledTimes(1);

  stubs.status.state = "granted";
  stubs.fireChange();
  vi.advanceTimersByTime(1000);
  await flush();
  expect(stubs.read.mock.calls.length).toBeGreaterThan(1);
});

test("denied permission never polls", async () => {
  const stubs = installStubs("denied");

  await importConst();
  window.dispatchEvent(new Event("load"));
  window.dispatchEvent(new Event("pointerdown"));
  await flush();
  vi.advanceTimersByTime(2000);
  await flush();

  expect(stubs.read).not.toHaveBeenCalled();
});

test("granted permission polls without raising a prompt", async () => {
  const stubs = installStubs("granted");

  await importConst();
  window.dispatchEvent(new Event("load"));
  window.dispatchEvent(new Event("pointerdown"));
  await flush();
  vi.advanceTimersByTime(1000);
  await flush();

  expect(stubs.read.mock.calls.length).toBeGreaterThan(1);
});
