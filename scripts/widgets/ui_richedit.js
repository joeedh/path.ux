import * as ui_base from '../core/ui_base.js'
import * as util from '../util/util.js';
import {ColumnFrame, RowFrame, Container} from "../core/ui.js";
let UIBase = ui_base.UIBase, Icons = ui_base.Icons;
import {TextBoxBase} from './ui_textbox.js';
import {keymap} from "../util/simple_events.js";

export class RichEditor extends TextBoxBase {
  constructor() {
    super();

    this._disabled = false;
    this._value = "";

    this.textOnlyMode = false;

    this.styletag = document.createElement("style");
    this.styletag.textContent = `
      div.rich-text-editor-x {
        width        :   100%;
        height       :   100%;
        min-height   :   150px;
        overflow     :   scroll;
        padding      :   5px;
        white-space  :   pre-wrap;
      }
      
      rich-text-editor-x {
        display        : flex;
        flex-direction : column;
      }
    `;

    this.shadow.appendChild(this.styletag);

    let controls = this.controls = document.createElement("rowframe-x");


    let makeicon = (icon, description, cb) => {
      icon = controls.iconbutton(icon, description, cb);
      icon.iconsheet = 1; //use second smallest icon size
      icon.overrideDefault("BoxMargin", 3);

      return icon;
    };

    makeicon(Icons.BOLD, "Bold", () => {
      document.execCommand("bold");
    });
    makeicon(Icons.ITALIC, "Italic", () => {
      document.execCommand("italic");
    });
    makeicon(Icons.UNDERLINE, "Underline", () => {
      document.execCommand("underline");
    });
    makeicon(Icons.STRIKETHRU, "Strikethrough", () => {
      document.execCommand("strikeThrough");
    });

    controls.background = this.getDefault("DefaultPanelBG");

    this.shadow.appendChild(controls);

    this.textarea = document.createElement("div");
    this.textarea.contentEditable = true;
    this.textarea.setAttribute("class", "rich-text-editor-x");

    this.textarea.style["font"] = this.getDefault("DefaultText").genCSS();
    this.textarea.style["background-color"] = this.getDefault("background-color");
    this.textarea.setAttribute("white-space", "pre-wrap");

    this.textarea.addEventListener("keydown", (e) => {
      if (e.keyCode === keymap["S"] && e.shiftKey && (e.ctrlKey || e.commandKey)) {
        this.toggleStrikeThru();

        e.preventDefault();
        e.stopPropagation();
      }
    });

    this.textarea.addEventListener("focus", (e) => {
      this._focus = 1;
      this.setCSS();
    });
    this.textarea.addEventListener("blur", (e) => {
      this._focus = 0;
      this.setCSS();
    });

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

      //console.log("text changed", ...arguments);
      let sel = document.getSelection();
      let range = sel.getRangeAt(0);
      //console.log(range.startOffset, range.endOffset, range.startContainer);

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

  toggleStrikeThru() {
    console.log("strike thru!");
    document.execCommand("strikeThrough");
  }
  /**
   * Only available in textOnlyMode.  Called when starting text formatting
   */
  formatEnd() {
  }

  init() {
    super.init();

    window.rc = this;

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

    this.controls.background = this.getDefault("DefaultPanelBG");

    if (this._focus) {
      this.textarea.style["border"] = `2px dashed ${this.getDefault('FocusOutline')}`;
    } else {
      this.textarea.style["border"] = "none";
    }

    if (this.style["font"]) {
      this.textarea.style["font"] = this.style["font"];
    } else {
      this.textarea.style["font"] = this.getDefault("DefaultText").genCSS();
    }

    if (this.style["color"]) {
      this.textarea.style["color"] = this.style["color"];
    }  else {
      this.textarea.style["color"] = this.getDefault("DefaultText").color;
    }


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
