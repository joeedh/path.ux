import type { CDPSession, Locator, Page } from "@playwright/test";

/** One event the recorder saw on its target, in the order it fired. */
export interface RecordedEvent {
  type: string;
  inputType?: string;
  data?: string | null;
  isComposing?: boolean;
  cancelable?: boolean;
  /** The key a `keydown` carried. */
  key?: string;
  /**
   * The target's text when the event reached the recorder: after the default action of an
   * `input`, and as the browser left it at `compositionstart` and `compositionend`.
   */
  text?: string;
}

declare global {
  interface Window {
    __compositionEvents?: RecordedEvent[];
  }
}

const RECORDED = [
  "compositionstart",
  "compositionupdate",
  "compositionend",
  "beforeinput",
  "input",
  "keydown",
];

/**
 * Runs in the page: `installRecorder` hands it to `evaluate`, so it must close over nothing.
 * The listeners go on the target's parent in the capture phase, so the text read at
 * `compositionend` is what the browser left, before any listener on the target reacts. The
 * console-pasteable form in documentation/richtext.md prints the same lines.
 */
function recordOn(target: HTMLElement, names: readonly string[]): void {
  const events: RecordedEvent[] = (window.__compositionEvents = []);
  const textAt = new Set(["input", "compositionstart", "compositionend"]);
  const listenOn = target.parentNode ?? target;

  for (const type of names) {
    listenOn.addEventListener(
      type,
      (e) => {
        const entry: RecordedEvent = { type };
        const ie = e as InputEvent & CompositionEvent & KeyboardEvent;

        if (type === "keydown") {
          entry.key = ie.key;
          entry.isComposing = ie.isComposing;
        }
        if ("inputType" in ie) {
          entry.inputType = ie.inputType;
          entry.isComposing = ie.isComposing;
          entry.cancelable = ie.cancelable;
        }
        if ("data" in ie) {
          entry.data = ie.data;
        }
        if (textAt.has(type)) {
          entry.text = target.textContent ?? "";
        }

        events.push(entry);
      },
      true
    );
  }
}

/** Records every composition, input and keydown event on `target` into `window.__compositionEvents`. */
export function installRecorder(target: Locator): Promise<void> {
  return target.evaluate(recordOn, RECORDED);
}

/** Drains the recorded events, oldest first, and clears the record. */
export function takeEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(() => {
    const events = window.__compositionEvents ?? [];
    window.__compositionEvents = [];
    return events;
  });
}

/** Sets the composition text to `text` with the caret at its end. */
export async function setComposition(cdp: CDPSession, text: string): Promise<void> {
  await cdp.send("Input.imeSetComposition", {
    text,
    selectionStart: text.length,
    selectionEnd  : text.length,
  });
}

/**
 * Drives Chromium's IME: one `Input.imeSetComposition` per step, then `Input.insertText` with
 * `commit`, or an empty composition to abandon it when `commit` is `undefined`.
 */
export async function compose(
  cdp: CDPSession,
  steps: readonly string[],
  commit: string | undefined
): Promise<void> {
  for (const text of steps) {
    await setComposition(cdp, text);
  }

  if (commit === undefined) {
    await setComposition(cdp, "");
  } else {
    await cdp.send("Input.insertText", { text: commit });
  }
}

/** Presses and releases one key through CDP, by its `key` name and Windows virtual key code. */
export async function pressKey(
  cdp: CDPSession,
  key: string,
  code: string,
  vk: number
): Promise<void> {
  const common = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...common });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
}

/** The recorded sequence as one line per event, for the assertions and for the spec's notes. */
export function describeEvents(events: readonly RecordedEvent[]): string[] {
  return events.map((e) => {
    const parts = [e.type];
    if (e.key !== undefined) {
      parts.push(e.key);
    }
    if (e.inputType !== undefined) {
      parts.push(e.inputType);
    }
    if (e.data !== undefined) {
      parts.push(JSON.stringify(e.data));
    }
    if (e.isComposing !== undefined) {
      parts.push(e.isComposing ? "composing" : "not composing");
    }
    if (e.cancelable !== undefined) {
      parts.push(e.cancelable ? "cancelable" : "not cancelable");
    }
    if (e.text !== undefined) {
      parts.push(`text=${JSON.stringify(e.text)}`);
    }

    return parts.join(" ");
  });
}
