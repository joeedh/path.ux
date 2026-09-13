import type { CDPSession, Locator, Page } from "@playwright/test";

/** One event the recorder saw on its target, in the order it fired. */
export interface RecordedEvent {
  type: string;
  inputType?: string;
  data?: string | null;
  isComposing?: boolean;
  cancelable?: boolean;
  /** The target's text after the event's default action, read from `input` events. */
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
];

/** Runs in the page: `installRecorder` hands it to `evaluate`, so it must close over nothing. */
function recordOn(target: HTMLElement, names: readonly string[]): void {
  const events: RecordedEvent[] = (window.__compositionEvents = []);

  for (const type of names) {
    target.addEventListener(type, (e) => {
      const entry: RecordedEvent = { type };
      const ie = e as InputEvent & CompositionEvent;

      if ("inputType" in ie) {
        entry.inputType = ie.inputType;
        entry.isComposing = ie.isComposing;
        entry.cancelable = ie.cancelable;
      }
      if ("data" in ie) {
        entry.data = ie.data;
      }
      if (type === "input") {
        entry.text = target.textContent ?? "";
      }

      events.push(entry);
    });
  }
}

/** Records every composition and input event on `target` into `window.__compositionEvents`. */
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
    await cdp.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd  : text.length,
    });
  }

  if (commit === undefined) {
    await cdp.send("Input.imeSetComposition", { text: "", selectionStart: 0, selectionEnd: 0 });
  } else {
    await cdp.send("Input.insertText", { text: commit });
  }
}

/** The recorded sequence as one line per event, for the assertions and for the spec's notes. */
export function describeEvents(events: readonly RecordedEvent[]): string[] {
  return events.map((e) => {
    const parts = [e.type];
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

    return parts.join(" ");
  });
}
