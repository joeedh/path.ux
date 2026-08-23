import type { PlatformAPI } from "./platform_base";

let promise: Promise<{ platform: typeof PlatformAPI }> | undefined;

if ((window as unknown as Record<string, unknown>).haveNwjs) {
  promise = import("./nwjs/nwjs_api");
} else if ((window as unknown as Record<string, unknown>).haveElectron) {
  promise = import("./electron/electron_api");
} else {
  promise = import("./web/web_api");
}

/* Assigned once the backend module resolves; every caller runs long after
   that, which is why this is not declared optional. */
export var platform: typeof PlatformAPI;

promise.then((module) => {
  platform = module.platform;
  promise = undefined;
});

export function getPlatformAsync() {
  if (promise) {
    return new Promise((accept, reject) => {
      promise!.then((mod) => {
        accept(mod.platform);
      });
    });
  }

  return new Promise((accept, reject) => {
    accept(platform);
  });
}
