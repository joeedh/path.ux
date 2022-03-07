export class Version {
  constructor(major = 0, minor = 0, micro = 0, dev = 0) {
    this.major = major;
    this.minor = minor;
    this.micro = micro;
    this.dev = dev;
  }

  toJSON() {
    return [this.major, this.minor, this.micro, this.dev];
  }

  loadJSON(json) {
    this.major = json[0];
    this.minor = json[1];
    this.micro = json[2];
    this.dev = json[3];

    return this;
  }

  toInt() {
    let f = this.major<<24;

    f |= this.minor<<16;
    f |= this.micro<<8;
    f |= this.dev;

    return f;
  }
}

export default {
  DEBUG              : {
    screenborders    : 0,
    allBordersMovable: false,
    modalEvents      : true,
    areadocker       : false,
    /*
    customWindowSize: {
      width: 512, height: 512
    },
    //*/
  },

  useNativeToolTips  : false,
  showPathsInToolTips: true,
  autoSizeUpdate     : true,
  useAreaTabSwitcher : true,
  VERSION            : new Version(0, 0, 0, 0),
  LOCALSTORAGE_KEY   : "pathux_example_app"
};
