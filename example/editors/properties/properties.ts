import { createExternalDemo } from "./external_demo";
import { DocumentWidgetHost, WidgetRegistry } from "../../../scripts/widgets/richtext/plugins";
import { notePlugin } from "./note_plugin";
import { createFormsDemo } from "./forms_demo";
import {
  UIBase,
  nstructjs,
  util,
  PackNode,
  PackNodeVertex,
  Vector2,
  graphPack,
  loadUIData,
  saveUIData,
  mount,
  Container,
  TabContainer,
  ToolStack,
  pickAssetPopup,
  DocumentSession,
  PlainProvider,
  RichTextEditor,
  newBlockId,
  plainDocFromLines,
  saveFile,
} from "../../pathux.js";
import type {
  LinkInfo,
  ListBoxChangeEvent,
  PlainDoc,
  RefusedDetail,
  ThemeEditor,
  AssetGallery,
  AssetGalleryGrid,
  GalleryItem,
  GalleryChangeEvent,
  GalleryConfirmEvent,
  PopupCloseMode,
  PopupContainer,
} from "../../pathux.js";

import {
  MarkdownProvider,
  markdownDocFromText,
  markdownOps,
  markdownText,
} from "../../../scripts/widgets/richtext/markdown.js";
import type { MdDoc, WikilinkStart } from "../../../scripts/widgets/richtext/markdown.js";
import { Editor } from "../editor_base.js";
import { PropsPage } from "../../page.js";
import { theme, themeVars } from "../../theme.js";
import { MARKDOWN_SAMPLE } from "./markdown_sample.js";

// graphpack's PackNodeVertex tracks which side of a node a socket sits on; this
// app sets it when laying out the demo graph. It is not part of the library type.
declare module "../../pathux.js" {
  interface PackNodeVertex {
    side?: number;
  }
}

let graphNodes: { nodes: PackNode[]; nodemap: Record<number, PackNode> } | undefined;
let solveTimer: number | undefined;
let seed = 0;

export class PropsEditor extends Editor {
  _pageUIData: string | undefined;
  tabs!: TabContainer;
  _nodes!: PackNode[];
  _nodemap!: Record<number, PackNode>;
  themeEditor?: ThemeEditor;

  constructor() {
    super();

    this._pageUIData = undefined;
    this.minSize = [55, undefined];
    //this.maxSize = [350, undefined]
  }

  getKeyMaps() {
    return [];
  }

  _save_page_data() {
    if (!this.container) {
      return "";
    }

    const s = saveUIData(this.container, "page");
    return s;
  }

  loadPage() {
    if (!this.ctx) {
      console.log("waiting for ctx");
      this.doOnce(this.loadPage);
      return;
    }

    // Build the page from typed JSX (example/page.tsx). Interactive wiring that
    // the markup can't express is supplied through typed `ref` callbacks instead
    // of post-build getElementById lookups.
    mount(
      this.ctx,
      this.container,
      PropsPage({
        exportButton: (btn) => {
          btn.onclick = () => this.exportTheme();
        },
        themeEditor: (ed) => {
          this.themeEditor = ed as ThemeEditor;
          this.themeEditor.setVarTheme(theme, themeVars);
        },
        graphTab    : (tab) => this.buildGraphPack(tab),
        // CanvasPath has no name field; label list entries by id for the demo.
        listbox: (lb) => {
          lb.itemNames((obj) => "Path " + (obj as { id: number }).id);
        },
        galleryTab  : (tab) => this.buildGallery(tab),
        richTextTab : (tab) => this.buildRichText(tab),
        markdownTab : (tab) => this.buildMarkdown(tab),
        eventStrip: (con) => {
          con.dataPrefix = "";
          const bval = con.prop("data.boolval");
          const color = con.prop("data.color");

          color.dependsOn("hidden", bval, "value").invert();
        },
      })
    );

    this.container.flushUpdate();

    if (this._pageUIData) {
      console.log("PAGE UI DATA", this._pageUIData.slice(0, 100) + "...");

      loadUIData(this.container, this._pageUIData);
      this._pageUIData = undefined;
      this.container.flushUpdate();
    }
  }

  /**
   * Fills the Rich Text tab: two editors over one document on a toolstack of its own, so
   * Ctrl+Z inside either undoes the document rather than the app and each shows the other's
   * edits, and a third over a second document on the app's toolstack.
   */
  buildRichText(tab: Container) {
    const provider = new PlainProvider();
    const makeEditor = (session: DocumentSession<PlainDoc>, testid: string) => {
      const editor = UIBase.constructElement<RichTextEditor<typeof this.ctx, PlainDoc>>(
        RichTextEditor.define().tagname,
        this.ctx
      );
      editor.setAttribute("data-testid", testid);
      editor.style.width = "420px";
      editor.session = session;
      editor.addEventListener("refused", (e) => {
        const { inputType } = (e as CustomEvent<RefusedDetail>).detail;
        console.warn("rich text input refused:", inputType);
      });

      tab.add(editor);
      return editor;
    };

    tab.label(
      "Composition (IME and dead-key input, including accents) lands in the document as an ordinary edit."
    );

    const shared = new DocumentSession(
      plainDocFromLines(["Hello, world.", "A second paragraph to edit.", ""], () => newBlockId()),
      provider,
      new ToolStack()
    );
    tab.label("Two editors over one document, on the document's own toolstack:");
    makeEditor(shared, "richtext-editor");
    makeEditor(shared, "richtext-editor-2");

    const appDoc = new DocumentSession(
      plainDocFromLines(["On the app's toolstack.", ""], () => newBlockId()),
      provider,
      this.ctx.toolstack
    );
    tab.label("One editor on the app's toolstack, so Edit > Undo undoes it too:");
    makeEditor(appDoc, "richtext-editor-app");

    tab.label("A rich text property, bound through the container's textarea builder:");
    const field = tab.prop("data.text");
    field.setAttribute("data-testid", "richtext-field");
    field.style.width = "420px";
  }

  /**
   * Fills the Markdown tab: an editor over the sample document on its own toolstack, with a
   * Read-only toggle, a Save button, an outline of the headings that selects one on click,
   * and a status line that shows a wikilink's target. A spec loads another document through
   * `window.__loadMarkdown`, which opens a fresh session.
   */
  buildMarkdown(tab: Container) {
    // typing [[ offers the document's headings as wikilink targets
    const completeWikilink = (start: WikilinkStart) => {
      const session = editor.session;
      const anchor = editor.bridge.blockElement(start.block);
      if (session === undefined || anchor === undefined) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const popup = this.ctx.screen.popup(
        editor,
        rect.left,
        rect.bottom + 2,
        "click",
        undefined,
        window
      );
      const list = popup.listbox<string>();
      list.setAttribute("data-testid", "markdown-wikilink-list");
      list.style.width = "200px";
      list.style.height = "120px";
      for (const h of session.provider.headings?.(session.doc) ?? []) {
        list.addItem(session.provider.blockText(session.doc, h.block), h.block);
      }
      list.addEventListener("change", (e) => {
        const block = (e as ListBoxChangeEvent<typeof this.ctx, string>).selection.id;
        if (block === undefined) {
          return;
        }
        // the word typed after the [[ was the query, so it goes with it; the click has taken
        // the focus, so the caret is not there to ask
        const rest = session.provider.blockText(session.doc, start.block).slice(start.offset);
        const to = start.offset + (/^[^\s\]]*/.exec(rest)?.[0].length ?? 0);
        const target = session.provider.blockText(session.doc, block);
        void editor.dispatch(markdownOps.insertWikilink(start.block, start.offset - 2, to, target));
        popup.remove();
      });
    };

    const registry = new WidgetRegistry();
    registry.register(notePlugin);
    let pluginHost: DocumentWidgetHost<MdDoc> | undefined;
    const provider = new MarkdownProvider({ onWikilinkStart: completeWikilink });
    const editor = UIBase.constructElement<RichTextEditor<typeof this.ctx, MdDoc>>(
      RichTextEditor.define().tagname,
      this.ctx
    );
    editor.setAttribute("data-testid", "markdown-editor");
    editor.style.width = "560px";

    tab.label("A markdown document on its own toolstack; every block kind the provider renders:");

    const controls = tab.row();
    controls.button("Open external data demo", () => {
      const dialog = document.createElement("dialog");
      dialog.style.cssText = "max-height:85vh;overflow:auto;width:650px";
      document.body.append(dialog);
      const demo = createExternalDemo(dialog, this.ctx);
      const close = document.createElement("button");
      close.textContent = "Close external demo";
      close.addEventListener("click", async () => {
        if ((await demo.session.prepareSave()).status !== "ready") return;
        demo.dispose();
        dialog.close();
        dialog.remove();
      });
      dialog.addEventListener("cancel", (event) => event.preventDefault());
      dialog.append(close);
      dialog.showModal();
    });
    controls.button("Open forms demo", () => {
      const dialog = document.createElement("dialog");
      dialog.style.cssText = "max-height:85vh;overflow:auto;width:650px";
      document.body.append(dialog);
      const demo = createFormsDemo(dialog, this.ctx);
      const close = document.createElement("button");
      close.textContent = "Close forms demo";
      close.addEventListener("click", async () => {
        if (
          (await demo.session.prepareSave()).status !== "ready" ||
          (await demo.pluginSession.prepareSave()).status !== "ready" ||
          (await demo.adapters.session.prepareSave()).status !== "ready"
        )
          return;
        dialog.close();
        demo.dispose();
        dialog.remove();
      });
      dialog.addEventListener("cancel", (event) => event.preventDefault());
      dialog.append(close);
      dialog.showModal();
    });
    const readOnly = controls.check(undefined, "Read-only");
    readOnly.setAttribute("data-testid", "markdown-readonly");
    readOnly.on_change = (value: boolean) => {
      editor.readOnly = value;
    };
    const addNote = controls.button("Insert note widget", async () => {
      const session = editor.session;
      if (!session || !pluginHost) return;
      const result = await pluginHost.insert(
        { id: newBlockId(), type: notePlugin.type, version: 1, payload: { text: "New note" } },
        session.doc.blocks.at(-1)?.id ?? null,
        this.ctx
      );
      if (result.status !== "applied") status.text = `Insert refused: ${result.status}`;
    });
    addNote.setAttribute("data-testid", "markdown-insert-note");
    const save = controls.button("Save", async () => {
      const session = editor.session;
      if (session !== undefined) {
        const prepared = await session.prepareSave();
        if (prepared.status !== "ready") {
          status.text = `Save blocked: ${prepared.status}`;
          return;
        }
        saveFile(session.provider.emitDocFile(session.doc), "document.md", ["md"], "text/markdown");
      }
    });
    save.setAttribute("data-testid", "markdown-save");
    const status = controls.label("");
    status.setAttribute("data-testid", "markdown-status");

    // the outline: every heading, indented by level, selecting the block on click
    const body = tab.row();
    body.style.alignItems = "flex-start";
    const side = body.col();
    side.label("Outline");
    const outline = side.listbox<string>();
    outline.setAttribute("data-testid", "markdown-outline");
    outline.style.width = "180px";
    outline.style.height = "320px";
    let outlineKey = "";
    const rebuildOutline = () => {
      const session = editor.session;
      if (session === undefined) {
        return;
      }
      const { provider: p, doc } = session;
      const headings = p.headings?.(doc) ?? [];
      const rows = headings.map((h) => [h.block, h.level, p.blockText(doc, h.block)] as const);
      const key = JSON.stringify(rows);
      if (key === outlineKey) {
        return;
      }
      outlineKey = key;
      outline.clear();
      for (const [block, level, title] of rows) {
        outline.addItem("\u00a0\u00a0".repeat(level - 1) + title, block);
      }
    };
    outline.addEventListener("change", (e) => {
      const block = (e as ListBoxChangeEvent<typeof this.ctx, string>).selection.id;
      if (block === undefined || editor.session === undefined) {
        return;
      }
      const pos = { block, offset: 0 };
      // selecting first: focusing the root scrolls it back to wherever the caret was
      editor.select({ anchor: pos, head: pos });
      editor.scrollToBlock(block);
    });

    body.add(editor);

    const tableDemo = tab.col();
    tableDemo.label(
      "Table cells edit inline Markdown. Enter/Tab applies; Alt+arrows navigate; Shift extends cell selection."
    );
    const second = UIBase.constructElement<RichTextEditor<typeof this.ctx, MdDoc>>(
      "rich-text-x",
      this.ctx
    );
    second.setAttribute("data-testid", "markdown-second-view");
    second.style.width = "560px";
    const showSecond = tableDemo.check(undefined, "Show second view and committed source");
    showSecond.setAttribute("data-testid", "markdown-show-second");
    const comparison = tableDemo.col();
    comparison.add(second);
    const source = document.createElement("pre");
    source.setAttribute("data-testid", "markdown-source");
    source.style.cssText = "white-space:pre-wrap;max-width:560px;user-select:text";
    comparison.shadow.append(source);
    comparison.style.display = "none";
    showSecond.on_change = (value: boolean) => (comparison.style.display = value ? "" : "none");

    // a wikilink names something the app resolves; here that is the status line
    editor.addEventListener("linkclick", (e) => {
      const link = (e as CustomEvent<LinkInfo>).detail;
      if (link.kind === "wiki") {
        e.preventDefault();
        status.text = `Wikilink: ${link.target}`;
      }
    });

    let stopListening = () => {};
    const open = (text: string) => {
      if (editor.session?.pendingDrafts.length) {
        status.text = "Apply or discard drafts before replacing the document";
        return;
      }
      stopListening();
      pluginHost?.dispose();
      const session = new DocumentSession(markdownDocFromText(text), provider, new ToolStack());
      pluginHost = new DocumentWidgetHost(session, registry, {
        document : { path: "example/document.md" },
        authorize: ({ action }) => action !== "external",
      });
      editor.session = session;
      second.session = session;
      source.textContent = markdownText(session.doc);
      outlineKey = "";
      rebuildOutline();
      stopListening = session.onChange(() => {
        rebuildOutline();
        source.textContent = markdownText(session.doc);
      });
    };
    open(MARKDOWN_SAMPLE);
    window.__loadMarkdown = open;

    tab.label("A markdown property, bound through the container's textarea builder:");
    const field = tab.prop("data.markdown");
    field.setAttribute("data-testid", "markdown-field");
    field.style.width = "560px";
  }

  exportTheme() {
    if (!this.themeEditor) {
      return;
    }

    const src = this.themeEditor.createFile({
      importPath: "./pathux.js",
      onAssemble: (header, varsSrc, themeSrc, footer) =>
        [
          "/*",
          " * WARNING: AUTO-GENERATED FILE",
          " *",
          " * Copy to example/theme.ts",
          " */",
          "",
          header,
          varsSrc,
          themeSrc,
          footer,
        ].join("\n"),
    });

    const blob = new Blob([src], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);

    window.open(url);
  }

  init() {
    super.init();

    this.doOnce(this.loadPage);

    this.style.overflowY = "scroll";
  }

  copy() {
    const ret = UIBase.createElement<PropsEditor>(
      (this.constructor as unknown as typeof PropsEditor).define().tagname
    );
    ret.ctx = this.ctx;
    return ret;
  }

  /**
   * Fills the Gallery tab with a synthetic asset library. The thumbnails are drawn here rather
   * than fetched so the demo (and the Playwright specs that drive it) need no image files.
   */
  buildGallery(tab: Container) {
    const swatch = (index: number) => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;

      const g = canvas.getContext("2d")!;
      g.fillStyle = `hsl(${(index * 37) % 360}, 65%, 60%)`;
      g.fillRect(0, 0, size, size);
      g.fillStyle = "rgba(20, 20, 20, 1.0)";
      g.font = "16px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(index), size * 0.5, size * 0.5);

      return canvas;
    };

    const items: GalleryItem[] = [];
    for (let i = 0; i < 200; i++) {
      items.push({
        id        : "item-" + i,
        label     : "Item " + i,
        searchTags: [i % 2 === 0 ? "even" : "odd"],
        image     : () => Promise.resolve(swatch(i)),
      });
    }

    const grid = UIBase.createElement<AssetGalleryGrid>("assetgallerygrid-x");
    grid.setAttribute("data-testid", "gallery-grid");
    grid.style.width = "380px";
    grid.style.height = "300px";

    tab.add(grid);
    grid.setItems(items);

    // the specs read the last event back off the page rather than through a locator
    const record = (kind: string, id: string | undefined) => {
      (window as unknown as { galleryEvents: string[] }).galleryEvents ??= [];
      (window as unknown as { galleryEvents: string[] }).galleryEvents.push(kind + ":" + id);
    };
    grid.addEventListener("change", (e) =>
      record("change", (e as GalleryChangeEvent).selection.id)
    );
    grid.addEventListener("confirm", (e) =>
      record("confirm", (e as GalleryConfirmEvent).selection.id)
    );

    // list mode with a renderer of its own, counted so the specs can see create run once per
    // pooled row while bind runs for every item scrolled past
    const rows = UIBase.createElement<AssetGalleryGrid>("assetgallerygrid-x");
    rows.setAttribute("data-testid", "gallery-rows");
    rows.style.width = "380px";
    rows.style.height = "300px";
    rows.mode = "list";

    const counts = ((window as unknown as { rowCalls: Record<string, number> }).rowCalls = {
      create: 0,
      bind  : 0,
    });
    rows.rowRenderer = {
      create(box) {
        counts.create++;
        box.dom.appendChild(document.createElement("span"));
      },
      bind(box, item) {
        counts.bind++;
        box.dom.firstElementChild!.textContent = item ? "row-" + item.id : "";
      },
    };

    tab.add(rows);
    rows.setItems(items);

    const gallery = UIBase.createElement<AssetGallery>("assetgallery-x");
    gallery.setAttribute("data-testid", "gallery");
    tab.add(gallery);
    gallery.setItems(items);

    const pick = tab.button("Pick…", () => {
      pickAssetPopup(pick, { items }).then((item) => record("picked", item?.id));
    });
    pick.setAttribute("data-testid", "gallery-pick");
    pick.description = "Choose an item through the gallery popup";

    // one bare popup per close mode, so the specs can tell the modes apart by gesture alone
    for (const mode of ["click", "move", "click-move"] as PopupCloseMode[]) {
      const open = tab.button(String(mode), () => {
        // opened at a fixed corner so the specs know where it is not
        const popup = this.ctx.screen.popup(open, 100, 100, mode) as PopupContainer;
        popup.label("popup " + String(mode));
        popup.setAttribute("data-testid", "popup-" + String(mode));
        popup.flushUpdate();
      });
      open.setAttribute("data-testid", "open-" + String(mode));
      open.description = `Open a popup that closes on ${String(mode)}`;
    }
  }

  buildGraphPackNodes(size: number) {
    const nodes = (this._nodes = [] as PackNode[]);
    const nodemap = (this._nodemap = {} as Record<number, PackNode>);

    const rand = new util.MersenneRandom(seed++);
    const count = 35;
    size /= count;
    size = Math.sqrt(size) * 0.75;

    for (let i = 0; i < count; i++) {
      const n = new PackNode();
      n.pos[0] = 0;
      n.pos[1] = 0;

      n.size[0] = (rand.random() * 0.5 + 0.5) * size;
      n.size[1] = (rand.random() * 0.5 + 0.5) * size;

      for (let i = 0; i < 2; i++) {
        const scount = rand.random() * 8;
        const x = i ? n.size[0] : 0;
        let y = 0;
        const socksize = Math.min(20, n.size[1] / scount);

        for (let j = 0; j < scount; j++) {
          const v = new PackNodeVertex(n, [x, y]);
          v.side = i;
          n.verts.push(v);

          y += socksize;
        }
      }

      nodemap[n._id] = n;
      nodes.push(n);
    }

    let ri = 0;

    function randitem<T>(array: T[]): T {
      ri = ~~(Math.random() * array.length * 0.99999);
      return array[ri];
    }

    const visit2 = new Set<string>();

    const linkcount = count * 2.5 * (rand.random() * 0.5 + 0.5);

    for (let i = 0; i < linkcount; i++) {
      //let n1 = randitem(nodes), n2 = randitem(nodes);
      const ri = ~~(rand.random() * nodes.length * 0.99999);

      let ri2 = (ri + 1) % nodes.length;
      if (rand.random() > 0.8) {
        ri2 = ~~(rand.random() * nodes.length * 0.99999);
      }

      const n1 = nodes[ri];
      const n2 = nodes[ri2];

      const key = "" + Math.min(n1._id, n2._id) + ":" + Math.max(n1._id, n2._id);
      if (visit2.has(key)) {
        //n1._id)) {
        continue;
      }

      if (n1 === n2) continue;

      visit2.add(key);

      const s1 = randitem(n1.verts);
      const s2 = randitem(n2.verts);

      if (s1.edges.includes(s2)) {
        continue;
      }

      if (!s1 || !s2) continue;

      s1.edges.push(s2);
      s2.edges.push(s1);
    }

    graphNodes = {
      nodes,
      nodemap,
    };

    return graphNodes;
  }

  buildGraphPack(tab: Container) {
    let draw = (): void => {};

    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;
    const dpi = UIBase.getDPI();

    let w = 800;
    let h = 600;
    canvas.style["width"] = w / dpi + "px";
    canvas.style["height"] = h / dpi + "px";
    let scale = 0.25;

    canvas.addEventListener("wheel", (e) => {
      const df = Math.sign(e.deltaY) * 0.05;
      scale *= 1.0 - df;

      console.log("scale", scale);

      draw();
    });

    const margin = 55;

    if (!graphNodes) {
      graphNodes = this.buildGraphPackNodes(canvas.width * canvas.height);
      graphPack(graphNodes.nodes, { steps: 2, margin });
    }

    let { nodes } = graphNodes;
    canvas.style.border = "1px solid orange";

    draw = () => {
      if (this.size === undefined) {
        // properties editor is not active
        return;
      }

      w = ~~((this.size[0] - 75) * dpi);
      h = ~~(this.size[1] * dpi);

      canvas.style["width"] = w / dpi + "px";
      canvas.style["height"] = h / dpi + "px";
      canvas.width = w;
      canvas.height = h;

      g.resetTransform();
      g.clearRect(0, 0, canvas.width, canvas.height);

      g.translate(canvas.width * 0.5, canvas.height * 0.5);
      g.scale(scale, scale);
      g.translate(-canvas.width * 0.5, -canvas.height * 0.5);
      g.lineWidth = 2.0 / scale;

      g.beginPath();
      g.strokeStyle = "black";

      for (const node of nodes) {
        for (const v of node.verts) {
          const p1 = new Vector2(v).add(node.pos);

          for (const v2 of v.edges) {
            const p2 = new Vector2(v2).add(v2.node.pos);

            //let d = v.vectorDistance(v2)*1.5;
            const d = Math.abs(v2[0] - v[0]) * 1.5;

            const s1 = v.side ? -1 : 1;
            const s2 = v2.side ? -1 : 1;

            const dx1 = -s1 * d;
            const dy1 = 0.0;
            const dx2 = -s2 * d;
            const dy2 = 0.0;

            g.moveTo(p1[0], p1[1]);
            g.bezierCurveTo(p1[0] + dx1, p1[1] + dy1, p2[0] + dx2, p2[1] + dy2, p2[0], p2[1]);
            //g.lineTo(p2[0], p2[1]);
          }
        }
      }
      g.stroke();

      g.fillStyle = "teal";
      g.strokeStyle = "orange";

      g.beginPath();
      for (const node of nodes) {
        g.rect(node.pos[0], node.pos[1], node.size[0], node.size[1]);
      }
      g.fill();
      g.stroke();
    };

    const timercb = () => {
      if (!this.isConnected) {
        window.clearInterval(solveTimer);
        solveTimer = undefined;
        return;
      }

      const time = util.time_ms();
      while (util.time_ms() - time < 100) {
        graphPack(nodes, {
          steps: 2,
          speed: 0.1,
          margin,
        });
      }

      draw();
    };

    const strip = tab.row();

    strip.button("Reset", () => {
      nodes = this.buildGraphPackNodes(canvas.width * canvas.height).nodes;
      graphPack(nodes, { steps: 22, margin });
      draw();
    });

    strip.button("Pack", () => {
      graphPack(nodes, { steps: 22, margin });

      draw();
    });

    strip.button("Start/Stop", () => {
      console.log("pack!");
      //graphPack(nodes, undefined, undefined, draw);
      if (solveTimer !== undefined) {
        window.clearInterval(solveTimer);
        solveTimer = undefined;
        return;
      }

      solveTimer = window.setInterval(timercb, 30);

      draw();
    });

    tab.shadow.appendChild(canvas);
    draw();
  }

  static define() {
    return {
      tagname : "props-editor-x",
      areaname: "props",
      uiname  : "Properties",
      icon    : -1,
    };
  }
}
Editor.register(PropsEditor);
PropsEditor.STRUCT =
  nstructjs.STRUCT.inherit(PropsEditor, Editor) +
  `
  _pageUIData : string | this._save_page_data();
}
`;
nstructjs.register(PropsEditor);
