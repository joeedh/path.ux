import { UIBase } from "../core/ui_base.js";
import { Container } from "../core/ui.js";
import type { IContextBase } from "../core/context_base.js";
import { PanelContents, TabItemContainer } from "../pathux.js";
export declare const domTransferAttrs: Set<string>;
export declare const domEventAttrs: Set<string>;
export declare function parseXML(xml: string): XMLDocument;
export declare const customHandlers: Record<string, ((handler: Handler, elem: Element) => void) | "default">;
interface ContainerOptions {
    ignorePathPrefix?: boolean;
    noInheritCustomAttrs?: boolean;
}
type DOMAttrs = {
    [k: string]: string;
};
type DOMKeys = Set<string>;
type TemplateVars = {
    [k: string]: string;
};
type TemplateScope = {
    [k: string]: unknown;
};
type CodeFuncs = {
    [k: string]: (...args: unknown[]) => unknown;
};
type ContainerTypes = Container | TabItemContainer | PanelContents;
declare class Handler {
    container: ContainerTypes;
    stack: (DOMAttrs | DOMKeys | ContainerTypes)[];
    ctx: IContextBase;
    codefuncs: CodeFuncs;
    templateVars: TemplateVars;
    templateScope: TemplateScope;
    /** DOM attributes elements should inherit by default*/
    inheritDomAttrs: DOMAttrs;
    inheritDomAttrKeys: DOMKeys;
    constructor(ctx: IContextBase, container: Container);
    push(): void;
    pop(): void;
    handle(elem: Node): void;
    _style(elem: Element, elem2: Element | UIBase): void;
    visit(node: Node): void;
    _getattr(elem: Element, k: string): string | null;
    _inheritCustomAttrs(elem: Element, elem2: Element | UIBase): void;
    _basic(elem: Element, elem2: Element | UIBase, options?: ContainerOptions): void;
    _handlePathPrefix(elem: Element, con: Container): void;
    /** noInheritCustomAttrs: don't transfer ng or data- attributes to the container element*/
    _container(elem: Element, con: Container, options?: ContainerOptions): void;
    noteframe(elem: Element): void;
    cell(elem: Element): void;
    table(elem: Element): void;
    panel(elem: Element): void;
    pathlabel(elem: Element): void;
    /**
     handle a code element, which are wrapped in functions
     */
    code(elem: Element): void;
    textbox(elem: Element): void;
    label(elem: Element): void;
    colorfield(elem: Element): void;
    /** simpleSliders=true enables simple sliders */
    prop(elem: Element): void;
    _prop(elem: Element, key: string): void;
    strip(elem: Element): void;
    column(elem: Element): void;
    row(elem: Element): void;
    toolPanel(elem: Element): void;
    tool(elem: Element, key?: string): void;
    dropbox(elem: Element): import("../pathux.js").DropBox<IContextBase<any, import("../pathux.js").IToolStack>>;
    menu(elem: Element, isDropBox?: boolean): import("../pathux.js").DropBox<IContextBase<any, import("../pathux.js").IToolStack>>;
    button(elem: Element): void;
    iconbutton(elem: Element): void;
    tab(elem: Element): void;
    tabs(elem: Element): void;
}
interface LoadPageArgs {
    parentContainer?: HTMLElement;
    loadSourceOnly?: boolean;
    modifySourceCB?: (source: string) => string;
    templateVars?: TemplateVars;
    templateScope?: TemplateScope;
}
export declare function initPage(ctx: IContextBase, xml: string, parentContainer?: HTMLElement | undefined, templateVars?: Record<string, string>, templateScope?: TemplateScope): Container;
export declare function loadPage(ctx: IContextBase, url: string, parentContainer_or_args?: HTMLElement | LoadPageArgs | undefined, loadSourceOnly?: boolean, modifySourceCB?: (source: string) => string, templateVars?: TemplateVars, templateScope?: TemplateScope): Promise<Container | string>;
export {};
//# sourceMappingURL=xmlpage.d.ts.map