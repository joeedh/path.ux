let _clipdata = {
  name: "nothing",
  mime: "nothing",
  data: undefined
};

let _clipboards = {};

import * as ctrlconfig from '../path-controller/config/config.js';

window.setInterval(() => {
  let cb = navigator.clipboard;

  if (!cb || !cb.read) {
    return;
  }

  cb.read().then((data) => {
    for (let item of data) {
      for (let i = 0; i < item.types.length; i++) {
        let type = item.types[i];

        if (!(type in _clipboards)) {
          _clipboards[type] = {
            name: type,
            mime: type,
            data: undefined
          };
        }
        ;

        item.getType(type).then((blob) => new Response(blob).text()).then((text) => {
          _clipboards[type].data = text;
        });
      }

      //item.getType("text/css").then((blob) => blob.text()).then((text) => {
      //  console.log("text", text);
      //});
    }
    //_clipdata.mime =
  }).catch(function () {
  });
}, 200);

let exports = {
  /*client code can override this using .loadConstants, here is a simple implementation
    that just handles color data

    desiredMimes is either a string, or an array of strings
   */
  getClipboardData(desiredMimes = "text/plain") {
    if (typeof desiredMimes === "string") {
      desiredMimes = [desiredMimes];
    }

    for (let m of desiredMimes) {
      let cb = _clipboards[m];

      if (cb && cb.data) {
        return cb;
      }
    }
  },
  /*client code can override this, here is a simple implementation
    that just handles color data
   */
  setClipboardData(name, mime, data) {
    _clipboards[mime] = {
      name: name,
      mime: mime,
      data: data
    };

    let clipboard = navigator.clipboard;
    if (!clipboard) {
      return;
    }

    try {
      clipboard.write([new ClipboardItem({
        [mime]: new Blob([data], {type: mime})
      })]).catch((error) => {
        //try pushing through text/plain
        if (mime.startsWith("text") && mime !== "text/plain") {
          this.setClipboardData(name, "text/plain", data);
        } else {
          console.error(error);
        }
      });
    } catch (error) {
      console.log(error.stack);
      console.log("failed to write to system clipboard");
    }
  },
  colorSchemeType: "light",
  docManualPath  : "../simple_docsys/doc_build/",
  docEditorPath: "../simple_docsys.js",

  //add textboxes to rollar sliders,
  //note that  users can also double click them to
  //enter text as well
  useNumSliderTextboxes: true,

  numSliderArrowLimit: 15, //threshold to check if numslider arrow was clicked
  simpleNumSliders   : false,

  menusCanPopupAbove: false,
  menu_close_time   : 500,
  doubleClickTime   : 500,

  //timeout for press-and-hold (touch) version of double clicking
  doubleClickHoldTime: 750,
  DEBUG              : {
    paranoidEvents      : false,
    screenborders       : false,
    areaContextPushes   : false,
    allBordersMovable   : false,
    doOnce              : false,
    modalEvents         : false,
    areaConstraintSolver: false,
    datapaths           : false,

    domEvents        : false,
    domEventAddRemove: false,

    debugUIUpdatePerf: false, //turns async FrameManager.update_intern loop into sync

    screenAreaPosSizeAccesses: false,
    buttonEvents             : false,

    /*
    customWindowSize: {
      width: 2048, height: 2048
    },
    //*/
  },

  //auto load 1d bspline templates, can hurt startup time
  autoLoadSplineTemplates: true,

  addHelpPickers: true,

  useAreaTabSwitcher : false,
  autoSizeUpdate     : true,
  showPathsInToolTips: true,

  enableThemeAutoUpdate: true,
  useNativeToolTips: true,

  loadConstants: function (args) {
    for (let k in args) {
      if (k === "loadConstants")
        continue;

      this[k] = args[k];
    }

    console.error("CC", ctrlconfig);
    ctrlconfig.setConfig(this);
  }
};

export default exports;
window.DEBUG = exports.DEBUG;

let cfg = document.getElementById("pathux-config");
if (cfg) {
  console.error("CONFIG CONFIG", cfg.innerText);
  exports.loadConstants(JSON.parse(cfg.innerText));
}
