let docsys = require('./simple_docsys/docsys.js');
let docsysConfig = docsys.readConfig("./simple_docsys/docs.config.js");

exports.rpcMethods = {
  updateDoc : docsysConfig.updateDoc.bind(docsysConfig),
  newDoc : docsysConfig.newDoc.bind(docsysConfig),
  hasDoc : docsysConfig.hasDoc.bind(docsysConfig),
  uploadImage : docsysConfig.uploadImage.bind(docsysConfig)
};

exports.handle = function(method, args) {
  method = method.trim();

  return new Promise((accept, reject) => {
    if (!exports.rpcMethods[method]) {
      reject("Unknown method " + method);
    }

    method = exports.rpcMethods[method];

    try {
      let ret = method.apply(undefined, args);
      let buf;
      try {
        buf = JSON.stringify({
          result : ret
        })
      } catch (error) {
        console.log(error);
        reject("" + error);
        return;
      }

      accept(buf);
    } catch (error) {
      console.log(error);
      reject(""+error);
      //reject(error.message);
    }
  });
}