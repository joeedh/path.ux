let promise: Promise<{ platform: unknown }> | undefined;

if ((window as unknown as Record<string, unknown>).haveElectron) {
  promise = import('./electron/electron_api');
} else {
  promise = import('./web/web_api');
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
