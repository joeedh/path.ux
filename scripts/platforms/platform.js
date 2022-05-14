let promise;

if (window.haveElectron) {
  promise = import('./electron/electron_api.js');
} else {
  promise = import('./web/web_api.js');
}

export var platform;

promise.then((module) => {
  platform = module.platform;
  promise = undefined;
});

export function getPlatformAsync() {
  if (promise) {
    return new Promise((accept, reject) => {
      promise.then(mod => {
        accept(mod.platform);
      });
    });
  }

  return new Promise((accept, reject) => {
    accept(platform);
  })
}
