/**
 * Compile-time typing for path.ux JSX. Declares the global `JSX` namespace so
 * tsgo type-checks tag names, attributes, and — crucially — `path` props against
 * {@link KnownDataPath}. Out of the box `KnownDataPath` is `string`; after
 * `pnpm run gen:paths` augments `DataPathRegistry`, unknown paths become
 * compile errors here exactly as they do for `container.prop(...)`.
 *
 * Importing this module (even for side effects) pulls the global declaration
 * into the program; `scripts/pathux.ts` does so.
 */

import type { KnownDataPath } from "../core/datapath_registry";
import type { Container } from "../core/ui";
import type { UIBase } from "../core/ui_base";
import type { ListBox } from "../widgets/ui_listbox";
import type { PXChild, PXNode, Ref } from "./jsx-runtime";

type JSXChildren = PXChild | PXChild[];

/** XML-ish boolean: real booleans or the string spellings xmlpage accepts. */
type XBool = boolean | "true" | "false" | "yes" | "no";
type IconMode = XBool | "small" | "large";
type Size = number | string;

interface BaseAttrs {
  children?: JSXChildren;
  id?: string;
  title?: string;
  class?: string;
  style?: string;
  width?: Size;
  height?: Size;
  margin?: Size;
  padding?: Size;
  "theme-class"?: string;
  "data-testid"?: string;
}

interface ContainerAttrs extends BaseAttrs {
  ref?: Ref<Container>;
  path?: KnownDataPath;
  massSetPath?: string;
  useIcons?: IconMode;
  showLabel?: XBool;
  sliderMode?: "slider" | "roller";
}

interface LeafAttrs extends BaseAttrs {
  ref?: Ref<UIBase>;
  useIcons?: IconMode;
}

interface PathAttrs extends LeafAttrs {
  path: KnownDataPath;
  massSetPath?: string;
}

declare global {
  namespace JSX {
    type Element = PXNode;

    interface ElementChildrenAttribute {
      children: unknown;
    }

    interface IntrinsicElements {
      // structural containers
      tabs: ContainerAttrs & {
        pos?: "top" | "bottom" | "left" | "right";
        "movable-tabs"?: XBool;
      };
      tab: ContainerAttrs & { label: string; overflow?: string; "overflow-y"?: string };
      panel: ContainerAttrs & { label: string; closed?: XBool };
      strip: ContainerAttrs & {
        mode?: "horizontal" | "vertical";
        margin1?: number;
        margin2?: number;
      };
      row: ContainerAttrs;
      column: ContainerAttrs;
      table: ContainerAttrs;
      cell: ContainerAttrs;

      // data-bound widgets
      prop: PathAttrs;
      pathlabel: PathAttrs;
      textbox: PathAttrs & { modal?: XBool; realtime?: XBool };
      colorfield: PathAttrs;

      // lists / menus
      listbox: BaseAttrs & {
        ref?: Ref<ListBox>;
        path?: KnownDataPath;
        "resize-axes"?: string;
        resizable?: XBool;
      };
      menu: LeafAttrs & { name?: string };
      dropbox: LeafAttrs & { name?: string };

      // tools & buttons (children supply the visible label)
      tool: LeafAttrs & { path: string };
      toolPanel: LeafAttrs & { path: string };
      button: LeafAttrs;
      iconbutton: LeafAttrs & { icon?: string };
      label: LeafAttrs;

      /**
       * Registered custom widgets (`*-x` tags) fall back to
       * `UIBase.createElement`. Typed loosely until `gen:paths` can emit precise
       * entries for them.
       */
      [tag: `${string}-x`]: BaseAttrs & { ref?: Ref<UIBase> } & Record<string, unknown>;
    }
  }
}

export {};
