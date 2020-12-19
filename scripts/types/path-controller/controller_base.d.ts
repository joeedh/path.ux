export as namespace controller_base;

import {Context} from "../core/context";
import {ToolOp} from "../toolsys/toolsys";

import {ToolProperty, EnumProperty, FlagProperty} from "../toolsys/toolprop";

declare interface resolvePathRet {
    value : any;
    obj : any;
    dstruct : DataStruct;
    dpath : DataPath;
    prop : ToolProperty<any>;
}

declare class DataAPI {
    mapStruct(cls: Function, autoCreate: boolean): DataStruct;
    hasStruct(cls: Function): Boolean;
    resolvePath(ctx: any, path: string): resolvePathRet;
    getValue(ctx: any, path: string): any;
    setValue(ctx: any, path: string): void;
    massSetProp(ctx: any, massSetPath: string, value: any): void;
    execTool(ctx: any, path: string, inputs: any): ToolOp;
    execTool(ctx: any, tool: ToolOp, inputs: any): ToolOp;
}

declare class DataPath {
    readOnly(): DataPath;

    customGetSet(get: Function, set: Function): DataPath;

    customSet(set: Function): DataPath;

    customGet(get: Function): DataPath;

    on(type: string, callback: Function): DataPath;

    off(type: string, callback: Function): DataPath;

    simpleSlider(): DataPath;

    rollarSlider: DataPath;

    noUnits(): DataPath;

    baseUnit(unit: string): DataPath;

    displayUnit(unit: string): DataPath;

    range(min: number, max: number): DataPath;

    uiRange(min: number, max: number): DataPath;

    decimalPlaces(places: number): DataPath;

    uiNameGetter(callback: Function): DataPath;

    expRate(exp: number): DataPath;

    uniformSlider(state: boolean): DataPath;

    radix(r: number): DataPath;

    relativeStep(s: number): DataPath;

    step(s: number): DataPath;

    fullSaveUndo(): DataPath;

    icon(i: number): DataPath;

    icons(iconmap: any): DataPath

    descriptions(dmap: any): DataPath;

    uiNames(namemap: any): DataPath;

    description(tooltip: string): DataPath;
}

declare enum StructFlags {
    NO_UNDO = 1
}

declare interface ListIFace {
    getStruct(api: DataAPI, list: any, key: any): DataStruct;

    get(api: DataAPI, list: any, key: any): any;

    getKey(api: any, list: any, obj: any): any;

    getActive(api: any, list: any): any;

    setActive(api: any, list: any, val: any): void;

    set(api: any, list: any, key: any, val: any): void;

    getIter(): any;

    filter(api: any, list: any, filter: any): any;
}

declare class DataStruct {
    dynamicStruct(path: string, apiname: string, uiname: string, existingStruct?: DataStruct): DataStruct;

    struct(path: string, apiname: string, uiname: string, existingStruct?: DataStruct): DataStruct;

    color3(path: string, apiname: string, uiname: string, description: string): DataPath;

    color4(path: string, apiname: string, uiname: string, description: string): DataPath;

    arrayList(path: string, apiname: string, existingStruct: DataStruct, uiname: string, description: string): DataPath;

    vectorList(size: number, path: string, apiname: string, uiname: string, description: string): DataPath;

    string(path: string, apiname: string, uiname: string, description: string): DataPath;

    bool(path: string, apiname: string, uiname: string, description: string): DataPath;

    float(path: string, apiname: string, uiname: string, description: string): DataPath;

    int(path: string, apiname: string, uiname: string, description: string): DataPath;

    textblock(path: string, apiname: string, uiname: string, description: string): DataPath;

    vec2(path: string, apiname: string, uiname: string, description: string): DataPath;

    vec3(path: string, apiname: string, uiname: string, description: string): DataPath;

    vec4(path: string, apiname: string, uiname: string, description: string): DataPath;

    curve1d(path: string, apiname: string, uiname: string, description: string): DataPath;

    enum(path: string, apiname: string, enumdef: {}, uiname: string, description: string): DataPath;
    enum(path: string, apiname: string, enumdef: EnumProperty, uiname: string, description: string): DataPath;

    list(path: string, apiname: string, callbacks: ListIFace): DataPath;

    flags(path: string, apiname: string, enumdef: {}, uiname: string, description: string): DataPath;
    flags(path: string, apiname: string, enumdef: FlagProperty, uiname: string, description: string): DataPath;

    fromToolProp(path: string, prop: ToolProperty<any>, apiname: string): DataPath;

    add(dpath: DataPath): DataStruct;
}