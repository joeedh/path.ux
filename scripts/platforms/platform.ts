// @ts-nocheck
/* TS-NOCHECK RATIONALE: Dynamic import with window.haveElectron conditional,
 * exported mutable `platform` variable assigned asynchronously. */

let promise: Promise<{ platform: unknown }> | undefined;

if ((window as Record<string, unknown>).haveElectron) {
  promise = import('./electron/electron_api.js');
} else {
  promise = import('./web/web_api.js');
}

export var platform: unknown;

promise.then((module) => {
  platform = module.platform;
  promise = undefined;
});

export function getPlatformAsync() {
  if (promise) {
    return new Promise((accept, reject) => {
      promise!.then(mod => {
        accept(mod.platform);
      });
    });
  }

  return new Promise((accept, reject) => {
    accept(platform);
  })
}
