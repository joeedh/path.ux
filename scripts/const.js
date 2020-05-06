let exports = {
  menu_close_time : 500,
  DEBUG : {
    screenborders: false,
    allBordersMovable: false,
    /*
    customWindowSize: {
      width: 512, height: 512
    },
    */
  },

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
