import * as ctrlconfig from "../path-controller/config/config.js";

interface ClipboardEntry {
  name: string;
  mime: string;
  data: string | undefined;
}

const _clipboards: Record<string, ClipboardEntry> = {};

if (typeof document !== "undefined") {
  /* spawn clipboard reader */
  window.setInterval(() => {
    if (!document.hasFocus()) {
      return;
    }

    const cb = navigator.clipboard;
    if (!cb || !cb.read) {
      return;
    }

    cb
      .read()
      .then((data) => {
        for (const item of data) {
          for (let i = 0; i < item.types.length; i++) {
            const type = item.types[i];

            if (!(type in _clipboards)) {
              _clipboards[type] = {
                name: type,
                mime: type,
                data: undefined,
              };
            }

            item
              .getType(type)
              .then((blob) => new Response(blob).text())
              .then((text) => {
                _clipboards[type].data = text;
              });
          }
        }
      })
      .catch(function () {});
  }, 200);
}

export interface DebugFlags {
  paranoidEvents: boolean;
  screenborders: boolean;
  areaContextPushes: boolean;
  allBordersMovable: boolean;
  doOnce: boolean;
  modalEvents: boolean;
  areaConstraintSolver: boolean;
  datapaths: boolean;
  lastToolPanel: boolean;
  domEvents: boolean;
  domEventAddRemove: boolean;
  debugUIUpdatePerf: boolean;
  screenAreaPosSizeAccesses: boolean;
  buttonEvents: boolean;
  [key: string]: boolean;
}

export interface PathUXConstants {
  getClipboardData(desiredMimes?: string | string[]): ClipboardEntry | undefined;
  setClipboardData(name: string, mime: string, data: string): void;
  colorSchemeType: string;
  docManualPath: string;
  docEditorPath: string;
  useNumSliderTextboxes: boolean;
  numSliderArrowLimit: number;
  simpleNumSliders: boolean;
  menusCanPopupAbove: boolean;
  menu_close_time: number;
  doubleClickTime: number;
  doubleClickHoldTime: number;
  DEBUG: DebugFlags;
  autoLoadSplineTemplates: boolean;
  addHelpPickers: boolean;
  useAreaTabSwitcher: boolean;
  autoSizeUpdate: boolean;
  showPathsInToolTips: boolean;
  enableThemeAutoUpdate: boolean;
  useNativeToolTips: boolean;
  noElectronMenus: boolean;
  loadConstants(args: Partial<PathUXConstants>): void;
  [key: string]: unknown;
}

const cconst: PathUXConstants = {
  getClipboardData(desiredMimes: string | string[] = "text/plain"): ClipboardEntry | undefined {
    if (typeof desiredMimes === "string") {
      desiredMimes = [desiredMimes];
    }

    for (const m of desiredMimes) {
      const cb = _clipboards[m];
      if (cb && cb.data) {
        return cb;
      }
    }
    return undefined;
  },

  setClipboardData(name: string, mime: string, data: string): void {
    _clipboards[mime] = { name, mime, data };

    const clipboard = navigator.clipboard;
    if (!clipboard) {
      return;
    }

    try {
      clipboard
        .write([
          new ClipboardItem({
            [mime]: new Blob([data], { type: mime }),
          }),
        ])
        .catch((error: unknown) => {
          if (mime.startsWith("text") && mime !== "text/plain") {
            cconst.setClipboardData(name, "text/plain", data);
          } else {
            console.error(error);
          }
        });
    } catch (error) {
      console.log((error as Error).stack);
      console.log("failed to write to system clipboard");
    }
  },

  colorSchemeType: "light",
  docManualPath: "../simple_docsys/doc_build/",
  docEditorPath: "../simple_docsys.js",

  useNumSliderTextboxes: true,
  numSliderArrowLimit: 15,
  simpleNumSliders: false,

  menusCanPopupAbove: false,
  menu_close_time: 500,
  doubleClickTime: 500,
  doubleClickHoldTime: 750,

  DEBUG: {
    paranoidEvents: false,
    screenborders: false,
    areaContextPushes: false,
    allBordersMovable: false,
    doOnce: false,
    modalEvents: false,
    areaConstraintSolver: false,
    datapaths: false,
    lastToolPanel: false,
    domEvents: false,
    domEventAddRemove: false,
    debugUIUpdatePerf: false,
    screenAreaPosSizeAccesses: false,
    buttonEvents: false,
  },

  autoLoadSplineTemplates: true,
  addHelpPickers: true,
  useAreaTabSwitcher: false,
  autoSizeUpdate: true,
  showPathsInToolTips: true,
  enableThemeAutoUpdate: true,
  useNativeToolTips: true,
  noElectronMenus: false,

  loadConstants(args: Partial<PathUXConstants>): void {
    for (const k in args) {
      if (k === "loadConstants") continue;
      (cconst as Record<string, unknown>)[k] = (args as Record<string, unknown>)[k];
    }
    ctrlconfig.setConfig(cconst as unknown as Partial<typeof ctrlconfig.config>);
  },
};

export default cconst;
window.DEBUG = cconst.DEBUG;

if (typeof document !== "undefined") {
  const cfg = document.getElementById("pathux-config");
  if (cfg) {
    cconst.loadConstants(JSON.parse(cfg.innerText) as Partial<PathUXConstants>);
  }
}
if (typeof window?.PATHUX_CONFIG !== "undefined") {
  cconst.loadConstants(window.PATHUX_CONFIG as Partial<PathUXConstants>);
}
