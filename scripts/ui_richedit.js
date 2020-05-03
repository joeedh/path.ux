import * as ui_base from './ui_base.js'
import * as util from './util.js';
import {ColumnFrame, RowFrame, Container} from "./ui.js";
let UIBase = ui_base.UIBase;

export class RichEditor extends UIBase {
  constructor() {
    super();

    this._disabled = false;
    this._value = "";

    this.textOnlyMode = false;

    this.textarea = document.createElement("div");
    this.textarea.contentEditable = true;
    this.textarea.style["width"] = "100%";
    this.textarea.style["height"] = "100%";
    this.textarea.setAttribute("class", "rich-text-editor");

    this.textarea.style["overflow"] = "scroll";

    this.textarea.style["padding"] = "5px";
    this.textarea.style["font"] = this.getDefault("DefaultText").genCSS();
    this.textarea.style["background-color"] = this.getDefault("background-color");
    this.textarea.style["white-space"] = "pre-wrap";
    this.textarea.setAttribute("white-space", "pre-wrap");

    document.execCommand("styleWithCSS", true);

    window.ta = this;

    this.textarea.addEventListener("selectionchange", (e) => {
      console.log("sel1");
    });

    document.addEventListener("selectionchange", (e, b) => {
      console.log("sel2", document.getSelection().startNode, b);
    });

    this.textarea.addEventListener("input", (e) => {
      if (this.disabled) {
        return;
      }

      console.log("text input", e);

      let text;

      if (this.textOnlyMode) {
        text = this.textarea.innerText;
      } else {
        text = this.textarea.innerHTML;
      }

      if (this.textOnlyMode && text === this._value) {
        //formatting changed?
        console.log("detected formatting change");
        return;
      }

      console.log("text changed", ...arguments);
      let sel = document.getSelection();
      let range = sel.getRangeAt(0);
      console.log(range.startOffset, range.endOffset, range.startContainer);

      let node = sel.anchorNode;
      let off = sel.anchorOffset;

      this._value = text;

      //sel.collapse(node, off);

      if (this.hasAttribute("datapath")) {
        let path = this.getAttribute("datapath");
        this.setPathValue(this.ctx, path, this.value);
      }

      if (this.onchange) {
        this.onchange(this._value);
      }
      if (this.oninput) {
        this.oninput(this._value);
      }

      this.dispatchEvent(new InputEvent(this));
      this.dispatchEvent(new CustomEvent('change'));
    });

    this.shadow.appendChild(this.textarea);
  }

  /**
   * Only available in textOnlyMode.  Called when starting text formatting
  */
  formatStart() {
  }

  /**
  * Only available in textOnlyMode.  Formats html-formated line.
   *
   * @param line : line to format
   * @parem text : whole text
  * */
  formatLine(line, text) {
    return line;
  }

  /**
   * Only available in textOnlyMode.  Called when starting text formatting
   */
  formatEnd() {
  }

  init() {
    super.init();

    document.execCommand("defaultParagraphSeparator", false, "div");


    this.setCSS();
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(val) {
    let changed = !!this._disabled != !!val;

    if (changed || 1) {
      this._disabled = !!val;
      super.disabled = val;

      this.textarea.disabled = val;
      this.textarea.contentEditable = !val;
      this.setCSS();
    }
  }

  set value(val) {
    this._value = val;

    if (this.textOnlyMode) {
      let val2 = "";
      for (let l of val.split("\n")) {
        val2 += l + "<br>";
      }
      val = val2;
    }

    this.textarea.innerHTML = val;
  }

  get value() {
    return this._value;
  }

  setCSS() {
    super.setCSS();

    this.textarea.style["font"] = this.getDefault("DefaultText").genCSS();
    if (this.disabled) {
      this.textarea.style["background-color"] = this.getDefault("DisabledBG");
    } else {
      this.textarea.style["background-color"] = this.getDefault("background-color");
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);

    if (prop === undefined) {
      console.warn("invalid datapath " + path);

      this.disabled = true;
      return;
    }

    this.disabled = false;
    let value = this.getPathValue(this.ctx, path);

    if (value !== this._value) {
      console.log("text change");
      this.value = value;
    }
  }

  update() {
    super.update();

    this.updateDataPath();
  }

  static define() {return {
    tagname : "rich-text-editor-x",
    style   : "richtext"
  }}
}
UIBase.register(RichEditor);

export class RichViewer extends UIBase {
  constructor() {
    super();

    this.contents = document.createElement("div");
    this.contents.style["padding"] = "10px";
    this.contents.style["margin"] = "10px";
    this.contents.style["overflow"] = "scroll";

    this.shadow.appendChild(this.contents);
    this._value = "";
  }

  hideScrollBars() {
    this.contents.style["overflow"] = "hidden"
  }

  showScrollBars() {
    this.contents.style["overflow"] = "scroll"
  }

  //transforms text into final html form
  //note that client code is allowed to override this directly
  textTransform(text) {
    return text;
  }
  set value(val) {
    this._value = val;

    this.contents.innerHTML = this.textTransform(val);
  }

  get value() {
    return this._value;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);

    if (prop === undefined) {
      console.warn("invalid datapath " + path);

      this.disabled = true;
      return;
    }

    this.disabled = false;
    let value = this.getPathValue(this.ctx, path);

    if (value !== this.value) {
      this.value = value;
    }
  }

  update() {
    super.update();

    this.updateDataPath();
  }

  static define() {return {
    tagname : "html-viewer-x",
    style   : "html_viewer"
  }}
}
UIBase.register(RichViewer);
