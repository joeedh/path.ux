import * as ctrlconfig from "../path-controller/config/config";

interface ClipboardEntry {
  name: string;
  mime: string;
  data: string | undefined;
}

const _clipboards: Record<string, ClipboardEntry> = {};

const CLIPBOARD_POLL_MS = 200;

let _clipboardTimer: number | undefined = undefined;

function readClipboard(): void {
  if (!document.hasFocus()) {
    return;
  }

  const cb = navigator.clipboard;
  if (!cb?.read) {
    return;
  }

  cb.read()
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
}

function startClipboardReader(): void {
  if (_clipboardTimer === undefined) {
    _clipboardTimer = window.setInterval(readClipboard, CLIPBOARD_POLL_MS);
  }
}

function stopClipboardReader(): void {
  if (_clipboardTimer !== undefined) {
    window.clearInterval(_clipboardTimer);
    _clipboardTimer = undefined;
  }
}

/** Resolves to the clipboard-read PermissionStatus, or undefined where the
 * Permissions API doesn't know the descriptor (Firefox/Safari throw on it). */
async function queryClipboardPermission(): Promise<PermissionStatus | undefined> {
  const perms = navigator.permissions;
  if (!perms?.query) {
    return undefined;
  }

  try {
    return await perms.query({ name: "clipboard-read" as PermissionName });
  } catch {
    return undefined;
  }
}

function onPageLoad(cb: () => void): void {
  if (document.readyState === "complete") {
    cb();
  } else {
    window.addEventListener("load", cb, { once: true });
  }
}

function onUserGesture(cb: () => void): void {
  const events = ["pointerdown", "keydown", "touchstart"] as const;

  const handler = () => {
    for (const type of events) {
      window.removeEventListener(type, handler, true);
    }
    cb();
  };

  for (const type of events) {
    window.addEventListener(type, handler, { capture: true, passive: true });
  }
}

/* The clipboard reader is deferred instead of started on import: reading the
 * system clipboard raises the browser's permission prompt, and a prompt raised
 * during startup blocks page reloads the app may still be doing (e.g. a
 * COOP/COEP service worker refreshing to apply its headers). Waiting for `load`
 * alone isn't enough — that reload lands after it — so we also wait for the
 * first user gesture, which can't happen before the page is really up. Once the
 * user has answered, polling runs only while permission is granted. */
if (typeof document !== "undefined") {
  onPageLoad(() =>
    onUserGesture(() => {
      queryClipboardPermission().then((status) => {
        if (!status) {
          startClipboardReader();
          return;
        }

        const sync = () => {
          if (status.state === "granted") {
            startClipboardReader();
          } else {
            stopClipboardReader();
          }
        };

        status.addEventListener("change", sync);

        /* Still inside the gesture's transient activation, so this one read is
         * what actually raises the prompt; `sync` picks up the answer. */
        if (status.state === "prompt") {
          readClipboard();
        }

        sync();
      });
    })
  );
}

export interface DebugFlags {
  paranoidEvents?: boolean;
  screenborders?: boolean;
  areaContextPushes?: boolean;
  allBordersMovable?: boolean;
  doOnce?: boolean;
  modalEvents?: boolean;
  areaConstraintSolver?: boolean;
  datapaths?: boolean;
  lastToolPanel?: boolean;
  domEvents?: boolean;
  domEventAddRemove?: boolean;
  debugUIUpdatePerf?: boolean;
  screenAreaPosSizeAccesses?: boolean;
  buttonEvents?: boolean;
  [key: string]: boolean | undefined;
}

export interface IPathUXConstants {
  colorSchemeType?: "light" | "dark";
  useNumSliderTextboxes?: boolean;
  numSliderArrowLimit?: number;
  simpleNumSliders?: boolean;
  /** Can menus pop above dropboxes */
  menusCanPopupAbove?: boolean;
  menu_close_time?: number;
  doubleClickTime?: number;
  doubleClickHoldTime?: number;
  autoLoadSplineTemplates?: boolean;
  /** Add tooltip picker tools to screen area headers for mobile devices. */
  addHelpPickers?: boolean;
  autoSizeUpdate?: boolean;
  showPathsInToolTips?: boolean;
  enableThemeAutoUpdate?: boolean;
  useNativeToolTips?: boolean;
  noElectronMenus?: boolean;
  DEBUG?: DebugFlags;
  docManualPath?: string;
  docEditorPath?: string;
}

interface PathUXConfigProvider extends Required<IPathUXConstants> {
  getClipboardData(desiredMimes?: string | string[]): ClipboardEntry | undefined;
  setClipboardData(name: string, mime: string, data: string): void;
  loadConstants(args: IPathUXConstants): void;
  [key: string]: unknown;
}

const cconst: PathUXConfigProvider = {
  getClipboardData(desiredMimes: string | string[] = "text/plain"): ClipboardEntry | undefined {
    if (typeof desiredMimes === "string") {
      desiredMimes = [desiredMimes];
    }

    for (const m of desiredMimes) {
      const cb = _clipboards[m];
      if (cb?.data) {
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
  docManualPath  : "../simple_docsys/doc_build/",
  docEditorPath  : "../simple_docsys.js",

  useNumSliderTextboxes: true,
  numSliderArrowLimit  : 15,
  simpleNumSliders     : false,

  menusCanPopupAbove : false,
  menu_close_time    : 500,
  doubleClickTime    : 500,
  doubleClickHoldTime: 750,

  DEBUG: {
    paranoidEvents           : false,
    screenborders            : false,
    areaContextPushes        : false,
    allBordersMovable        : false,
    doOnce                   : false,
    modalEvents              : false,
    areaConstraintSolver     : false,
    datapaths                : false,
    lastToolPanel            : false,
    domEvents                : false,
    domEventAddRemove        : false,
    debugUIUpdatePerf        : false,
    screenAreaPosSizeAccesses: false,
    buttonEvents             : false,
  },

  autoLoadSplineTemplates: true,
  addHelpPickers         : true,
  autoSizeUpdate         : true,
  showPathsInToolTips    : true,
  enableThemeAutoUpdate  : true,
  useNativeToolTips      : true,
  noElectronMenus        : false,

  loadConstants(args: IPathUXConstants): void {
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
    cconst.loadConstants(JSON.parse(cfg.innerText) as Partial<PathUXConfigProvider>);
  }
}
if (typeof window?.PATHUX_CONFIG !== "undefined") {
  cconst.loadConstants(window.PATHUX_CONFIG as Partial<PathUXConfigProvider>);
}
