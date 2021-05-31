import {UIBase} from '../core/ui_base.js';
import * as util from '../path-controller/util/util.js';
import {keymap} from '../path-controller/util/simple_events.js';

export class ProgressCircle extends UIBase {
  constructor() {
    super();

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

    this.shadow.appendChild(this.canvas);
    this.size = 150;
    this.animreq = undefined;
    this._value = 0.0;
    this.startTime = util.time_ms();
  }

  init() {
    super.init();
    this.flagRedraw();
    this.update();

    //enable keyboard focus
    this.tabIndex = 0;
    this.setAttribute("tab-index", 0);
    this.setAttribute("tabindex", 0);

    let onkey = (e) => {
      switch (e.keyCode) {
        case keymap["Escape"]:
          if (this.oncancel) {
            this.oncancel(this);
          }
          break;
      }
    }

    this.addEventListener("keydown", onkey);
    this.canvas.addEventListener("keydown", onkey);
  }

  flagRedraw() {
    if (this.animreq !== undefined) {
      return;
    }

    this.animreq = requestAnimationFrame(() => {
      this.animreq = undefined;
      this.draw();
    })
  }

  draw() {
    let c = this.canvas, g = this.g;

    let clr1 = "rgb(68,69,83)";
    let clr2 = "rgb(141,154,196)";
    let clr3 = "rgb(214,110,54)";

    let t = (util.time_ms() - this.startTime) / 1000.0;

    g.save();
    g.clearRect(0, 0, c.width, c.height);

    g.lineWidth /= c.width*0.5;
    g.scale(c.width, c.height);
    g.translate(0.5, 0.5);

    g.fillStyle = clr2;
    g.strokeStyle = clr1;

    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, 0.45, Math.PI, -Math.PI);
    //g.closePath()

    g.moveTo(0, 0);
    g.arc(0, 0, 0.2, Math.PI, -Math.PI);
    //g.closePath()

    g.clip("evenodd");

    g.beginPath();
    g.arc(0, 0, 0.45, -Math.PI, Math.PI);
    g.fill();
    g.stroke();

    g.beginPath();
    g.arc(0, 0, 0.2, Math.PI, -Math.PI);
    g.stroke();

    g.beginPath();

    let th = this._value*Math.PI*2.0;

    let steps = 12;
    let dth = (Math.PI*2.0) / steps;
    let lwid = g.lineWidth;
    g.lineWidth *= 3;

    for (let i=0; i<steps; i++) {
      let th1 = i * dth;
      th1 += t;

      let r1 = 0.2;
      let r2 = 0.45;
      let th2 = th1 + dth*0.5;

      g.beginPath();
      g.moveTo(Math.cos(th1)*r1, Math.sin(th1)*r1);
      g.lineTo(Math.cos(th2)*r2, Math.sin(th2)*r2);
      g.strokeStyle = "rgba(255,255,255,0.5)";
      g.stroke();
    }

    g.lineWidth = lwid;

    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, 0.4, Math.PI, -Math.PI);
    //g.closePath()

    g.clip("evenodd");

    g.beginPath();
    g.fillStyle = clr3;
    g.moveTo(0, 0);
    g.arc(0, 0, 0.45, 0, th);
    g.lineTo(0, 0);
    g.fill();

    g.strokeStyle = "rgb(141,154,196)";
    g.stroke();

    g.restore();
  }

  set value(percent) {
    this._value = percent;
    this.flagRedraw();
  }

  get value() {
    return this._value;
  }

  startTimer() {
    if (this.timer !== undefined) {
      return;
    }

    this.focus();

    window.setInterval(() => {
      if (!this.isConnected) {
        this.endTimer();
        return;
      }

      this.flagRedraw();
    }, 50);
  }

  endTimer() {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer);
    }
    this.timer = undefined;
  }

  update() {
    if (!this.isConnected && this.timer) {
      this.endTimer();
    }

    let size = ~~(this.size*UIBase.getDPI());

    if (size !== this.canvas.width) {
      this.setCSS();
    }
  }

  setCSS() {
    let c = this.canvas;

    let size = ~~(this.size*UIBase.getDPI());

    if (c.width !== size) {
      c.width = c.height = size;

      size /= UIBase.getDPI();
      c.style["width"] = size + "px";
      c.style["height"] = size + "px";

      c.style["display"] = "flex";

      this.style["width"] = size + "px";
      this.style["height"] = size + "px";

      //forcibly redraw in this case, do not queue with flagRedraw
      this.draw();
    }

    this.style["display"] = "flex";
    this.style["align-items"] = "center";
    this.style["justify-content"] = "center";
    this.style["width"] = "100%";
    this.style["height"] = "100%";
  }

  static define() {
    return {
      tagname : "progress-circle-x"
    }
  }
}
UIBase.register(ProgressCircle);
