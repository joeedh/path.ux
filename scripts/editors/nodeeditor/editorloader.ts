import { IContextBase } from "../../core/context_base";
import { haveModal } from "../../path-controller/util/simple_events";
import { _themeUpdateKey } from "../../core/base/ui_theme_key";
import type { NodeFrame } from "./nodeframe";
import type { NodeGraphView } from "./nodegraphview";

/** An element of this class stands for a value editor until it's built. */
export const PLACEHOLDER_CLASS = "nodeeditor-placeholder";

/** Editors aren't built for frames shown smaller than this; nobody could read them. */
export const EDITOR_MIN_SCALE = 0.35;

/** A frame is near the view if growing the view this many times would touch it. */
const NEAR = 1.5;

/** A frame is hidden, and shown again, when the view would have to grow this many times. */
const HIDE = 2.5;
const SHOW = 2;

/** A pass may go on starting new editors for this many milliseconds. */
const PASS_MS = 16;

/** A pass runs once the transform has been unchanged for this many milliseconds. */
const SETTLE_MS = 100;

/** A pass that has to wait for that, or for a modal tool, is tried again after this long. */
const RETRY_MS = 100;

/** A sync that adds or changes at most this many frames builds their editors at once. */
export const BUILD_NOW_FRAMES = 4;

/**
 * Builds the value editors of a view's frames a few at a time, in animation frames, for the
 * frames in and near the view. Until then a frame shows placeholders of the same height. Nothing
 * is built while a modal tool runs or the view is moving. An editor that was built stays.
 */
export class EditorLoader<CTX extends IContextBase = IContextBase> {
  private view: NodeGraphView<CTX>;
  private scheduled = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private lastTransform = -Infinity;
  private heights = new Map<string, number>();
  private themeKey = _themeUpdateKey;

  /** Records whether placeholders were resized since the links were drawn. */
  private moved = false;

  /** Records whether editors were built since the last "editorsloaded" event. */
  private built = false;

  constructor(view: NodeGraphView<CTX>) {
    this.view = view;
  }

  /** Answers the height of this kind of editor, if one has been built. */
  height(key: string): number | undefined {
    if (this.themeKey !== _themeUpdateKey) {
      this.themeKey = _themeUpdateKey;
      this.heights.clear();
    }
    return this.heights.get(key);
  }

  /** Records a built editor's height, and gives it to the placeholders of its kind. */
  learnHeight(key: string, height: number) {
    if (height <= 0 || this.height(key) === height) {
      return;
    }
    this.heights.set(key, height);
    this.moved = true;
    for (const frame of this.view.frames.values()) {
      frame.resizePlaceholders(key, height);
    }
  }

  /** Asks for a pass once the view has been still for a moment. */
  transformChanged() {
    this.lastTransform = performance.now();
    this.request();
  }

  /** Asks for a pass after a while. A timer, not an animation frame, waits out a modal tool. */
  private retryLater() {
    if (this.retryTimer === undefined) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = undefined;
        if (this.view.isConnected) {
          this.request();
        }
      }, RETRY_MS);
    }
  }

  /** Asks for a pass in the next animation frame. */
  request() {
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.pass();
    });
  }

  /** Says whether any frame lacks editors, near the view or not. It's cheap, unlike wanted(). */
  private anyPending(): boolean {
    for (const frame of this.view.frames.values()) {
      if (frame.pendingEditors > 0) {
        return true;
      }
    }
    return false;
  }

  /** Counts the editors that should be built now and are still missing. */
  pending(): number {
    return this.wanted().reduce((n, frame) => n + frame.pendingEditors, 0);
  }

  /**
   * Answers a function that measures how far a frame is from the view. It gives the distance from
   * the center in graph units, and how many times larger the view would have to be to touch the
   * frame. The answer is undefined if the view has no size.
   */
  private distances(): ((frame: NodeFrame<CTX>) => { dist: number; grow: number }) | undefined {
    const { panzoom } = this.view;
    const r = panzoom?.getBoundingClientRect();
    if (r === undefined || r.width === 0 || r.height === 0) {
      return undefined;
    }
    const tf = panzoom.transform;
    const w = (r.width * 0.5) / tf.scale;
    const h = (r.height * 0.5) / tf.scale;
    const center = tf.unproject([r.width * 0.5, r.height * 0.5]);
    return (frame) => {
      const pos = frame.previewPos ?? frame.node.pos;
      const size = frame.outerSize();
      const dx = Math.max(Math.abs(pos[0] + size[0] * 0.5 - center[0]) - size[0] * 0.5, 0);
      const dy = Math.max(Math.abs(pos[1] + size[1] * 0.5 - center[1]) - size[1] * 0.5, 0);
      return { dist: Math.hypot(dx, dy), grow: Math.max(dx / w, dy / h) };
    };
  }

  /** Finds the frames in and near the view that lack editors, nearest to its center first. */
  private wanted(): NodeFrame<CTX>[] {
    const scale = this.view.panzoom?.transform.scale ?? 0;
    if (scale < EDITOR_MIN_SCALE) {
      return [];
    }
    const lacking = [...this.view.frames.values()].filter((f) => f.pendingEditors > 0);
    const distance = lacking.length > 0 ? this.distances() : undefined;
    if (distance === undefined) {
      return [];
    }
    return lacking
      .map((frame) => ({ frame, ...distance(frame) }))
      .filter((f) => f.grow <= NEAR)
      .sort((a, b) => a.dist - b.dist)
      .map((f) => f.frame);
  }

  /**
   * Hides the frames well outside the view, since Chromium paints them otherwise. They keep their
   * DOM, layout and state. A frame with the focus or a live drag stays visible.
   */
  cull() {
    const distance = this.distances();
    if (distance === undefined) {
      return;
    }
    for (const frame of this.view.frames.values()) {
      const hidden = frame.style.visibility === "hidden";
      const keep = frame.previewPos !== undefined || frame.shadow.activeElement !== null;
      const far = !keep && distance(frame).grow > (hidden ? SHOW : HIDE);
      if (far !== hidden) {
        frame.style.visibility = far ? "hidden" : "";
      }
    }
  }

  /** Builds wanted editors until the time is up; the tests call it directly. */
  pass(now = performance.now()) {
    if (!this.view.isConnected) {
      return;
    }
    if (this.view.panzoom.transform.scale < EDITOR_MIN_SCALE) {
      // a change of the transform asks for a pass
      return;
    }
    if (this.anyPending() && (haveModal() || now - this.lastTransform < SETTLE_MS)) {
      this.retryLater();
      return;
    }

    const wanted = this.wanted();
    const end = performance.now() + PASS_MS;
    let left = false;
    let built = false;
    for (const frame of wanted) {
      while (frame.pendingEditors > 0) {
        if (built && performance.now() >= end) {
          left = true;
          break;
        }
        frame.loadEditor();
        built = true;
      }
      if (left) {
        break;
      }
    }

    this.built ||= built;
    const done = this.built && !left;
    // measuring every row for the links forces a layout, so only do it when they could move
    if (this.moved || done) {
      this.moved = false;
      this.view.editorsChanged();
    }
    if (left) {
      this.request();
    }
    if (done) {
      this.built = false;
      this.view.dispatchEvent(new CustomEvent("editorsloaded"));
    }
  }

  /** Builds every editor the frames lack, wherever they are. */
  loadNow(frames: Iterable<NodeFrame<CTX>>) {
    for (const frame of frames) {
      while (frame.pendingEditors > 0) {
        frame.loadEditor();
      }
    }
  }
}
