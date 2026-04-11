export declare const SocketFlags: {
    UPDATE: number;
};
export declare const NodeFlags: {
    UPDATE: number;
    SORT_TAG1: number;
    SORT_TAG2: number;
};
export declare const RecalcFlags: {
    RUN: number;
    RESORT: number;
};
export declare const SocketTypes: {
    INPUT: "inputs";
    OUTPUT: "outputs";
};
export type SocketType = "inputs" | "outputs";
export interface SocketDef {
    typeName: string;
    uiName: string;
    flag: number;
}
export interface GraphNodeDef {
    typeName: string;
    uiName: string;
    flag: number;
    inputs: Record<string, EventSocket>;
    outputs: Record<string, EventSocket>;
}
export declare class EventSocket {
    static socketDef: SocketDef;
    name: string;
    id: number;
    flag: number;
    edges: EventSocket[];
    node: EventNode | undefined;
    type: SocketType | undefined;
    constructor(node?: EventNode);
    get value(): unknown;
    set value(v: unknown);
    get isUpdated(): number;
    copyFrom(b: EventSocket): this;
    copy(): EventSocket;
    flagUpdate(): this | void;
    flagResort(): this;
    connect(sockb: EventSocket): this;
    hasNode(node: EventNode | NodeCapable): boolean;
    has(sockb: EventSocket): boolean;
    disconnect(sockb?: EventSocket | undefined): this;
}
export declare class NodeCapable {
    graphNode?: EventNode;
    static graphNodeDef: GraphNodeDef;
    graphExec(): void;
}
export declare class EventNode {
    owner: NodeCapable;
    inputs: Record<string, EventSocket>;
    outputs: Record<string, EventSocket>;
    allsockets: EventSocket[];
    graph: EventGraph | undefined;
    sortIndex: number;
    id: number;
    flag: number;
    static register(cls: {
        graphNodeDef?: GraphNodeDef;
    }, def: GraphNodeDef): GraphNodeDef;
    addSocket(type: SocketType, key: string, sock: EventSocket): this;
    static isNodeCapable(cls: Record<string, unknown>): boolean;
    constructor(owner: NodeCapable);
    static init(owner: NodeCapable): EventNode;
    flagUpdate(): this;
    flagResort(): this;
}
export declare class EventGraph {
    #private;
    nodes: EventNode[];
    flag: number;
    nodeIdMap: Map<number, EventNode>;
    sockIdMap: Map<number, EventSocket>;
    sortlist: EventNode[];
    queueReq: number | true | undefined;
    constructor();
    add(node: EventNode | NodeCapable): void;
    has(node: EventNode | NodeCapable): boolean;
    eventNode(node: EventNode | NodeCapable): EventNode;
    remove(node: EventNode | NodeCapable): void;
    flagResort(node?: EventNode | NodeCapable): this;
    flagUpdate(node: EventNode | NodeCapable): this;
    sort(): void;
    queueExec(): void;
    exec(): void;
}
export declare const theEventGraph: EventGraph;
export declare class DependSocket extends EventSocket {
    #private;
    static socketDef: SocketDef;
    get value(): unknown;
    set value(v: unknown);
    copyFrom(b: DependSocket): this;
}
export declare const PropSocketModes: {
    REPLACE: number;
    MIN: number;
    MAX: number;
};
type PropertyCallback<T = any> = (newval: T, oldval?: T) => T;
export declare class PropertySocket<T = any> extends EventSocket {
    #private;
    static socketDef: SocketDef;
    mixMode: number;
    oldValue?: T;
    mode(mixmode: number): this;
    copyFrom(b: PropertySocket): this;
    invert(state?: boolean): this;
    callback(cb: PropertyCallback): this;
    get value(): T | undefined;
    set value(v: T);
    bind(obj: any, key: string): this;
}
export {};
//# sourceMappingURL=eventdag.d.ts.map