export as namespace ui_base;

type pathUXInt = number;

import {ToolOp} from '../toolsys/simple_toolsys';
import {Context} from './context';

interface ModalInterface {
    resolvePath(ctx : Context, path : string);
    getValue(ctx : Context, path : string);
    execTool(ctx : Context, tool : string);
    execTool(ctx : Context, tool : ToolOp);
}

declare class UIBase extends HTMLElement {
    ctx : Context;

    constructor();

    /** called regularly by a setInterval timer, see FrameManager.listen*/
    update();

    /* called after constructor, since DOM limits what you can do in constructor
    *  (e.g. you can't modifer .style or set attributes)*/
    init();

    /*queue a function callback, multiple repeated calls will be ignored*/
    doOnce(func : Function);
    setCSS();

    /* float element by setting z-index and setting position to absolute*/
    float(x : number, y : number, zindex : number);
    float(x : number, y : number);
}
