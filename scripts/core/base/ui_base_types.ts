import type { CSSFont } from "../cssfont";
import type { ThemeSchema } from "../theme_schema";
import type { UIBase } from "../ui_base";

export type DefaultTypes = string | number | boolean | CSSFont;

export interface IUIBaseConstructor<T extends UIBase = UIBase> {
  new (): T;

  define(): UIBaseDefinition;
  setDefault<T2 extends T>(element: T2): T2;
}

export const PackFlags = {
  INHERIT_WIDTH : 1,
  INHERIT_HEIGHT: 2,
  VERTICAL      : 4,
  USE_ICONS     : 8,
  SMALL_ICON    : 16,
  LARGE_ICON    : 32,

  FORCE_PROP_LABELS         : 64, //force propeties (Container.prototype.prop()) to always have labels
  PUT_FLAG_CHECKS_IN_COLUMNS: 128, //group flag property checkmarks in columns (doesn't apply to icons)

  WRAP_CHECKBOXES: 256,

  //internal flags
  STRIP_HORIZ            : 512,
  STRIP_VERT             : 1024,
  STRIP                  : 512 | 1024,
  SIMPLE_NUMSLIDERS      : 2048,
  FORCE_ROLLER_SLIDER    : 4096,
  HIDE_CHECK_MARKS       : 1 << 13,
  NO_NUMSLIDER_TEXTBOX   : 1 << 14,
  CUSTOM_ICON_SHEET      : 1 << 15,
  CUSTOM_ICON_SHEET_START: 20, //custom icon sheet bits are shifted to here
  NO_UPDATE              : 1 << 16,
  // force property labels to the right
  LABEL_ON_RIGHT         : 1 << 17,
  // do not flush change events in modal paths such as
  // e.g. numsliders, text boxes, etc.
  NO_REALTIME            : 1 << 18,
  // force property labels to the right
  LABEL_ON_TOP           : 1 << 19,
  LABEL_ON_LEFT          : 1 << 20,
  // used to force a widget to not have a label,
  // when it might otherwise due to its container's
  // inhert_packflag.  overrides FORCE_PROP_LABELS
  NO_PROP_LABELS         : 1 << 21,
} as const;

/* Helper for CSSStyleDeclaration string indexing, common throughout this file */
export type StyleRecord = CSSStyleDeclaration & Record<string, string>;

export interface UIBaseDefinition {
  tagname: string;
  style?: string;
  subclassChecksTheme?: boolean;
  havePickClipboard?: boolean;
  pasteForAllChildren?: boolean;
  copyForAllChildren?: boolean;
  parentStyle?: string;
  /**
   * Theme keys this element consumes, mapped to `t.*` schema tokens (see
   * theme_schema.ts). Read by the `gen:themes` build step; an element inherits
   * its parent class's declarations, so only list keys it adds or overrides.
   */
  theme?: ThemeSchema;
}

export interface DisableData {
  style: Record<string, string>;
  defaults: Record<string, unknown>;
}

export interface ToolTipState {
  start_timer: (e?: Event) => void;
  stop_timer: (e?: Event) => void;
  reset_timer: (e?: Event) => void;
  start_events: string[];
  reset_events: string[];
  stop_events: string[];
  handlers: Record<string, EventListener>;
}

export type EventIF = { [k: string]: Event };

/** Bounding box of a widget and every child widget, in client coordinates. */
export interface TotalRect {
  width: number;
  height: number;
  x: number;
  y: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Overrides for the unit/format state {@link UIBase.formatNumber} otherwise reads off the widget. */
export interface FormatNumberArgs {
  baseUnit?: string;
  displayUnit?: string;
  isInt?: boolean;
  radix?: number;
  decimalPlaces?: number;
}

/** Filters applied to a {@link UIBase.pickElement} / {@link UIBase.pickElements} hit test. */
export interface PickArgs {
  nodeclass?: IUIBaseConstructor;
  excluded_classes?: IUIBaseConstructor[];
  clip?: { pos: number[]; size: number[] };
  mouseEvent?: MouseEvent | PointerEvent;
}
