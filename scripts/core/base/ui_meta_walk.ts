import { UIBase } from "../ui_base";
import { allMeta, getMeta, StdUXMeta, widgetSegment, type MetaOwner } from "./ui_meta_tags";

// This module holds the half of the tag system that needs the DOM. ui_meta_tags.ts stays
// importable from node, which is what lets a rules module build the same record headlessly.

/**
 * Every tag-bearing node under `root`, in document order. Descends `childNodes` and then any
 * shadow root, the descent `saveUIData` walks, so a widget inside a shadow tree is reached. A
 * node carrying no tag is walked through rather than yielded.
 */
export function* walkWidgets(root: Node): Generator<MetaOwner> {
  if (allMeta(root).length > 0) {
    yield root as MetaOwner;
  }

  for (const child of root.childNodes) {
    yield* walkWidgets(child);
  }

  const shadow = root instanceof UIBase ? root.shadow : undefined;
  if (!shadow) {
    return;
  }

  for (const child of shadow.childNodes) {
    yield* walkWidgets(child);
  }
}

/**
 * Names one control as `<scope>/<segment>`. The scope comes from the caller, because a widget
 * tree does not know which home it is drawn in. Two controls in one scope can produce the same
 * path; detecting that belongs to whoever assembles the scope's records. Answers undefined for
 * an owner carrying no `StdUXMeta`.
 */
export function widgetPathOf(owner: MetaOwner, scope: string): string | undefined {
  const tag = getMeta(owner, StdUXMeta);

  return tag === undefined ? undefined : `${scope}/${widgetSegment(tag)}`;
}
