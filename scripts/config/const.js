let exports = {
  menu_close_time : 500,
  DEBUG : {
    screenborders: false,
    areaContextPushes: false,
    allBordersMovable: false,
    doOnce: false,
    modalEvents : true,
    areaConstraintSolver : false,
    datapaths : false,

    domEvents : false,
    domEventAddRemove : false,

    debugUIUpdatePerf : false, //turns async FrameManager.update_intern loop into sync

    screenAreaPosSizeAccesses : false,
    buttonEvents : false,

    /*
    customWindowSize: {
      width: 512, height: 512
    },
    */
  },

  addHelpPickers : true,

  useAreaTabSwitcher: true,
  autoSizeUpdate : true,
  showPathsInToolTips: true,

  loadConstants : function(args) {
    for (let k in args) {
      if (k === "loadConstants")
        continue;

      this[k] = args[k];
    }
  }
};

export default exports;
