import { UIBase, Icons } from "../core/ui_base.js";
import { IContextBase } from "../core/context_base.js";
import { RowFrame } from "../core/ui.js";
import { CSSFont } from "../core/cssfont.js";
import { TextBoxBase } from "./ui_textbox.js";
import { keymap } from "../path-controller/util/simple_events.js";

export class RichEditor<CTX extends IContextBase = IContextBase> extends TextBoxBase<CTX> {
  _internalDisabled: boolean;
  _value: string;
  textOnlyMode: boolean;
  styletag: HTMLStyleElement;
  controls: RowFrame<CTX>;
  textarea: HTMLDivElement;
  _focus: number;

  constructor() {
    super();

    this._internalDisabled = false;
    this._value = "";
    this._focus = 0;

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

    const controls = (this.controls = UIBase.createElement("rowframe-x") as unknown as RowFrame<CTX>);

    const makeicon = (icon: number, description: string, cb: () => void) => {
      const btn = controls.iconbutton(icon, description, cb);
      btn.iconsheet = 1; //use second smallest icon size
      btn.overrideDefault("padding", 3);

      return btn;
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

    controls.background = this.getDefault("background-color") as string;

    this.shadow.appendChild(controls);

    this.textarea = document.createElement("div");
    this.textarea.contentEditable = "true";
    this.textarea.setAttribute("class", "rich-text-editor-x");

    this.textarea.style.font = (this.getDefault("DefaultText") as CSSFont).genCSS();
    this.textarea.style.backgroundColor = this.getDefault("background-color") as string;
    this.textarea.setAttribute("white-space", "pre-wrap");

    this.textarea.addEventListener("keydown", (e) => {
      if (e.keyCode === keymap["S"] && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        this.toggleStrikeThru();

        e.preventDefault();
        e.stopPropagation();
      }
    });

    this.textarea.addEventListener("focus", () => {
      this._focus = 1;
      this.setCSS();
    });
    this.textarea.addEventListener("blur", () => {
      this._focus = 0;
      this.setCSS();
    });

    document.execCommand("styleWithCSS", true as any);

    (window as any).ta = this;

    this.textarea.addEventListener("selectionchange" as any, () => {
      console.log("sel1");
    });

    document.addEventListener("selectionchange", () => {
      console.log("sel2", (document.getSelection() as any)?.startNode);
    });

    this.textarea.addEventListener("input", () => {
      if (this.internalDisabled) {
        return;
      }

      let text: string;

      if (this.textOnlyMode) {
        text = this.textarea.innerText;
      } else {
        text = this.textarea.innerHTML;
      }

      if (this.textOnlyMode && text === this._value) {
        console.log("detected formatting change");
        return;
      }

      const sel = document.getSelection()!;
      const range = sel.getRangeAt(0);

      const node = sel.anchorNode;
      const off = sel.anchorOffset;

      this._value = text;

      if (this.hasAttribute("datapath")) {
        const path = this.getAttribute("datapath")!;
        this.setPathValue(this.ctx, path, this.value);
      }

      if (this.onchange) {
        (this.onchange as any)(this._value);
      }
      if (this.oninput) {
        (this.oninput as any)(this._value);
      }

      this.dispatchEvent(new CustomEvent("input"));
      this.dispatchEvent(new CustomEvent("change"));
    });

    this.shadow.appendChild(this.textarea);
  }

  formatStart() {}

  formatLine(line: string, text: string) {
    return line;
  }

  toggleStrikeThru() {
    console.log("strike thru!");
    document.execCommand("strikeThrough");
  }

  formatEnd() {}

  init() {
    super.init();

    (window as any).rc = this;

    document.execCommand("defaultParagraphSeparator", false, "div");

    this.setCSS();
  }

  get internalDisabled() {
    return this._internalDisabled;
  }

  set internalDisabled(val: boolean) {
    const changed = !!this._internalDisabled !== !!val;

    if (changed || 1) {
      this._internalDisabled = !!val;
      super.internalDisabled = val;

      (this.textarea as any).internalDisabled = val;
      this.textarea.contentEditable = String(!val);
      this.setCSS();
    }
  }

  set value(val: string) {
    this._value = val;

    if (this.textOnlyMode) {
      let val2 = "";
      for (const l of val.split("\n")) {
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

    this.controls.background = this.getDefault("background-color");

    if (this._focus) {
      this.textarea.style.border = `2px dashed ${this.getDefault("focus-border-color")}`;
    } else {
      this.textarea.style.border = "none";
    }

    if (this.style.font) {
      this.textarea.style.font = this.style.font;
    } else {
      this.textarea.style.font = (this.getDefault("DefaultText") as CSSFont).genCSS();
    }

    if (this.style.color) {
      this.textarea.style.color = this.style.color;
    } else {
      this.textarea.style.color = (this.getDefault("DefaultText") as CSSFont).color;
    }

    if (this.disabled) {
      this.textarea.style.backgroundColor = this.getDefault("DisabledBG") as string;
    } else {
      this.textarea.style.backgroundColor = this.getDefault("background-color") as string;
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    const path = this.getAttribute("datapath")!;
    const prop = this.getPathMeta(this.ctx, path);

    if (prop === undefined) {
      console.warn("invalid datapath " + path);

      this.internalDisabled = true;
      return;
    }

    this.internalDisabled = false;
    const value = this.getPathValue(this.ctx, path) as string;

    if (value !== this._value) {
      console.log("text change");
      this.value = value;
    }
  }

  update() {
    super.update();

    this.updateDataPath();
  }

  static define() {
    return {
      tagname       : "rich-text-editor-x",
      style         : "richtext",
      modalKeyEvents: true,
    };
  }
}
UIBase.internalRegister(RichEditor);

export class RichViewer<CTX extends IContextBase = IContextBase> extends UIBase<CTX, string> {
  contents: HTMLDivElement;
  _value: string;

  constructor() {
    super();

    this.contents = document.createElement("div");
    this.contents.style.padding = "10px";
    this.contents.style.margin = "10px";
    this.contents.style.overflow = "scroll";

    this.shadow.appendChild(this.contents);
    this._value = "";
  }

  hideScrollBars() {
    this.contents.style.overflow = "hidden";
  }

  showScrollBars() {
    this.contents.style.overflow = "scroll";
  }

  textTransform(text: string) {
    return text;
  }

  set value(val: string) {
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

    const path = this.getAttribute("datapath")!;
    const prop = this.getPathMeta(this.ctx, path);

    if (prop === undefined) {
      console.warn("invalid datapath " + path);

      this.internalDisabled = true;
      return;
    }

    this.internalDisabled = false;
    const value = this.getPathValue(this.ctx, path) as string;

    if (value !== this.value) {
      this.value = value;
    }
  }

  update() {
    super.update();

    this.updateDataPath();
  }

  static define() {
    return {
      tagname: "html-viewer-x",
      style  : "html_viewer",
    };
  }
}
UIBase.internalRegister(RichViewer);
