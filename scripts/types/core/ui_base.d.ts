export as namespace ui_base;

type pathUXInt = number;

import {ToolOp} from '../toolsys/toolsys';
import {Context} from './context';
import {DataStruct} from "../path-controller/controller_base";
import {DataPath} from "../path-controller/controller_base";
import {ToolProperty} from "../toolsys/toolprop";


declare class UIBase extends HTMLElement {
    ctx : Context;

    constructor();

    /** called regularly by a setInterval timer, see FrameManager.listen*/
    update(): void;

    /* called after constructor, since DOM limits what you can do in constructor
    *  (e.g. you can't modifer .style or set attributes)*/
    init(): void;

    /*queue a function callback, multiple repeated calls will be ignored*/
    doOnce(func : Function): void;
    setCSS(): void;

    /* float element by setting z-index and setting position to absolute*/
    float(x : number, y : number, zindex : number): void;
    float(x : number, y : number): void;
}
