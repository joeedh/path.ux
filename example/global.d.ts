import type { AppState } from "./core/app.js";
import type { DataRef as DataRefClass } from "./core/datablock.js";

declare global {
  // Set in core/app.ts::start() and referenced as a bare global throughout the app.
  var _appstate: AppState;

  // Render request helpers installed on window in core/app.ts::start().
  var redraw_all: () => void;
  var redraw_all_full: () => void;

  // Debug-only global view context (core/app.ts).
  var CTX: unknown;

  // Needed as a global so nstructjs struct scripts can call DataRef.fromBlock (datablock.ts).
  var DataRef: typeof DataRefClass;

  // Misc globals stashed by editors.
  var theEventGraph: unknown;
  var NodeEditorTab: unknown;
  var haveElectron: boolean;

  interface Window {
    _appstate: AppState;
    redraw_all: () => void;
    redraw_all_full: () => void;
    CTX: unknown;
    DataRef: typeof DataRefClass;
    theEventGraph: unknown;
    NodeEditorTab: unknown;
    haveElectron: boolean;
    /** Opens a markdown document in the Markdown tab's editor, for the Playwright specs. */
    __loadMarkdown?: (text: string) => void;
  }
}

export {};
