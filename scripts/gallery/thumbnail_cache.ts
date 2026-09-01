/** Anything `CanvasRenderingContext2D.drawImage` accepts and a thumbnail cell can paint. */
export type ThumbSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

/**
 * One entry in a gallery. The host supplies these; the widget knows nothing about where the
 * pixels come from, so `image` may be a resolved source or a thunk that decodes one on demand.
 */
export interface GalleryItem {
  /** Stable identity, also the thumbnail cache key. */
  id: string;
  image: ThumbSource | (() => Promise<ThumbSource>);
  /** Shown under the thumbnail when the gallery is drawing labels. */
  label?: string;
  /** Hover text. Falls back to `label`, then to `id`. */
  tooltip?: string;
  /** Lowercased substring-matched by the gallery's search bar, alongside `label` and `id`. */
  searchTags?: string[];
}

/** Whether a cached source owns decoded bitmap memory that must be released explicitly. */
function isBitmap(src: ThumbSource): src is ImageBitmap {
  return typeof (src as ImageBitmap).close === "function";
}

/**
 * Decoded thumbnails keyed by {@link GalleryItem.id}, shared across every cell and every
 * gallery in the process. Concurrent requests for one id are coalesced onto a single load, so
 * a fast scroll that asks twice before the first decode finishes still decodes once.
 *
 * Eviction closes an `ImageBitmap`, which frees the decoded pixels immediately. A caller must
 * therefore not hold a source across an await — read it back through {@link peek} each time it
 * paints, and keep the capacity at or above the number of cells drawn at once
 * ({@link ensureCapacity}) so a visible thumbnail is never the one evicted.
 */
export class ThumbnailCache {
  private entries = new Map<string, ThumbSource>();
  private inFlight = new Map<string, Promise<ThumbSource>>();
  private _maxEntries: number;

  constructor(maxEntries = 200) {
    this._maxEntries = Math.max(1, maxEntries);
  }

  /** How many decoded thumbnails are held before the oldest is dropped. */
  get maxEntries(): number {
    return this._maxEntries;
  }

  set maxEntries(count: number) {
    this._maxEntries = Math.max(1, count);
    this.evict();
  }

  /** Number of decoded thumbnails currently held. */
  get size(): number {
    return this.entries.size;
  }

  /** Raises the capacity to `count` if it is lower. Never lowers it. */
  ensureCapacity(count: number): void {
    if (count > this._maxEntries) {
      this.maxEntries = count;
    }
  }

  /** The decoded thumbnail for `id` if it is already held, without starting a load. */
  peek(id: string): ThumbSource | undefined {
    const src = this.entries.get(id);
    if (src !== undefined) {
      // reinsert so the most recently painted id is the last one evicted
      this.entries.delete(id);
      this.entries.set(id, src);
    }
    return src;
  }

  /** The decoded thumbnail for `id`, running `loader` only when nothing else already is. */
  get(id: string, loader: () => Promise<ThumbSource>): Promise<ThumbSource> {
    const held = this.peek(id);
    if (held !== undefined) {
      return Promise.resolve(held);
    }

    const running = this.inFlight.get(id);
    if (running !== undefined) {
      return running;
    }

    const load = (async () => {
      try {
        const src = await loader();
        this.entries.set(id, src);
        this.evict();
        return src;
      } finally {
        this.inFlight.delete(id);
      }
    })();

    this.inFlight.set(id, load);
    return load;
  }

  /** Drops one entry and releases its bitmap. A load already running for `id` is unaffected. */
  delete(id: string): void {
    const src = this.entries.get(id);
    if (src === undefined) {
      return;
    }
    this.entries.delete(id);
    if (isBitmap(src)) {
      src.close();
    }
  }

  /** Drops every entry and releases every bitmap. */
  clear(): void {
    for (const id of [...this.entries.keys()]) {
      this.delete(id);
    }
  }

  private evict(): void {
    while (this.entries.size > this._maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) {
        return;
      }
      this.delete(oldest.value);
    }
  }
}

/** The cache every gallery uses unless its host passes one of its own. */
export const sharedThumbnailCache = new ThumbnailCache();
