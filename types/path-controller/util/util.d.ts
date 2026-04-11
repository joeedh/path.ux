import "./polyfill.js";
import "./struct.js";
export declare function isDenormal(f: number): boolean;
export declare const termColorMap: Record<string | number, string | number>;
export declare function termColor(s: string | symbol, c: string | number, d?: number): string;
export declare function termPrint(...args: unknown[]): string;
export declare class MovingAvg extends Array<number> {
    cur: number;
    used: number;
    sum: number;
    constructor(size?: number);
    reset(): this;
    add(val: number): number;
    sample(): number;
}
export declare const timers: Record<string, number>;
export declare function pollTimer(id: string, interval: number): boolean;
export declare function isMobile(): boolean;
interface SmartConsoleDataEntry {
    time: number;
    count: number;
}
export declare class SmartConsoleContext {
    name: string;
    color: string;
    __console: SmartConsole;
    timeInterval: number;
    timeIntervalAll: number;
    _last: number;
    last: SmartConsoleDataEntry | number;
    last2: number;
    _data: Record<number, SmartConsoleDataEntry>;
    _data_length: number;
    maxCache: number;
    constructor(name: string, console: SmartConsole);
    hash(args: IArguments | unknown[]): number;
    clearCache(): this;
    _getData(args: IArguments | unknown[]): SmartConsoleDataEntry;
    _check(args: IArguments | unknown[]): boolean;
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    trace(...args: unknown[]): void;
    error(...args: unknown[]): void;
}
export declare class SmartConsole {
    contexts: Record<string, SmartConsoleContext>;
    constructor();
    context(name: string): SmartConsoleContext;
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    trace(...args: unknown[]): void;
    error(...args: unknown[]): void;
}
export declare const console: SmartConsole;
export declare function getClassParent(cls: Function): Function | undefined;
export declare function list<T>(iterable: Iterable<T>): T[];
/** Count items in list; if searchItem is not undefined then a count
 *  of the number of times searchItem occurs will be returned.*/
export declare function count<T>(iterable: Iterable<T>, searchItem?: T): number;
export declare function getAllKeys(obj: object): Set<string | symbol>;
export declare function btoa(buf: ArrayBuffer | Uint8Array | string | string): string;
export declare function formatNumberUI(val: number | undefined | null, isInt?: boolean, decimals?: number): string;
export declare function atob(buf: string): Uint8Array;
export declare function time_ms(): number;
export declare function color2css(c: ArrayLike<number>): string;
export declare function merge<A extends object, B extends object>(obja: A, objb: B): A & B;
declare global {
    interface Window {
        /** debug cacherings */
        _cacherings?: cachering<any>[];
        _clear_all_cacherings?(kill_all?: boolean): void;
        _nonvector_cacherings?(): void;
        _stale_cacherings?(): cachering<unknown>[];
    }
}
export declare class cachering<T> extends Array<T> {
    private: boolean;
    cur: number;
    gen: number;
    constructor(func: () => T, size: number, isprivate?: boolean);
    static fromConstructor<U>(cls: new () => U, size: number, isprivate?: boolean): cachering<U>;
    next(): T;
}
interface KeystrObject {
    [Symbol.keystr](): string | number;
}
export declare class SetIter<T extends KeystrObject> {
    set: set<T>;
    i: number;
    ret: IteratorResult<T, undefined>;
    constructor(s: set<T>);
    [Symbol.iterator](): this;
    next(): IteratorResult<T, undefined>;
}
/**
 Set

 Stores objects in a set; each object is converted to a value via
 a [Symbol.keystr] method, and if that value already exists in the set
 then the object is not added.
 
 @deprecated
 **/
export declare class set<T extends KeystrObject> {
    items: (T | object)[];
    keys: Record<string, number>;
    freelist: number[];
    length: number;
    constructor(input?: Iterable<T> | {
        forEach(fn: (item: T) => void, thisArg: unknown): void;
    } | T[]);
    get size(): number;
    [Symbol.iterator](): SetIter<T>;
    equals(setb: set<T>): boolean;
    clear(): this;
    filter(f: (item: T, index: number, set: set<T>) => boolean, thisvar?: unknown): set<T>;
    map(f: (item: T, index: number, set: set<T>) => T, thisvar?: unknown): set<T>;
    reduce<U>(f: (acc: U | T, item: T, index: number, set: set<T>) => U, initial?: U): U | T;
    copy(): set<T>;
    add(item: T): void;
    delete(item: T, ignore_existence?: boolean): void;
    remove(item: T, ignore_existence?: boolean): void;
    has(item: T): boolean;
    forEach(func: (item: T) => void, thisvar?: unknown): void;
}
export declare class HashIter {
    hash: hashtable;
    i: number;
    ret: {
        done: boolean;
        value: unknown;
    };
    constructor(hash: hashtable);
    next(): {
        done: boolean;
        value: unknown;
    };
}
export declare class hashtable {
    _items: unknown[];
    _keys: Record<string, number>;
    length: number;
    constructor();
    [Symbol.iterator](): HashIter;
    set(key: KeystrObject, val: unknown): void;
    remove(key: KeystrObject): void;
    has(key: KeystrObject): boolean;
    get(key: KeystrObject): unknown;
    add(key: KeystrObject, val: unknown): void;
    keys(): unknown[];
    values(): unknown[];
    forEach(cb: (key: string, val: unknown) => void, thisvar?: unknown): void;
}
export declare class IDGen {
    __cur: number;
    _debug: boolean;
    _internalID: number;
    static STRUCT: string;
    constructor();
    get cur(): number;
    set cur(v: number);
    get _cur(): number;
    set _cur(v: number);
    static fromJSON(obj: {
        cur?: number;
        _cur?: number;
    }): IDGen;
    next(): number;
    copy(): IDGen;
    max_cur(id: number): void;
    toJSON(): {
        cur: number;
    };
    loadSTRUCT(reader: StructReader<this>): void;
}
export declare function print_stack(err?: Error): void;
export declare function fetch_file(path: string): Promise<string>;
export declare class MersenneRandom {
    index: number;
    mt: Uint32Array;
    constructor(seed?: number);
    random(): number;
    /** normal-ish distribution */
    nrandom(n?: number): number;
    seed(seed: number): void;
    extract_number(): number;
    twist(): void;
}
export declare function random(): number;
export declare function seed(n: number): void;
export declare function strhash(str: string): number;
export declare class FastHash extends Array<unknown> {
    cursize: number;
    size: number;
    used: number;
    constructor();
    resize(size: number): this;
    get(key: string | number | {
        valueOf(): number;
    }): unknown;
    has(key: string | number | {
        valueOf(): number;
    }): boolean;
    set(key: string | number | {
        valueOf(): number;
    }, val: unknown): void;
}
export declare function test_fasthash(): FastHash;
export declare class ImageReader {
    load_image(): Promise<ImageData>;
    example(): void;
}
/** NOT CRYPTOGRAPHIC */
export declare class HashDigest {
    i: number;
    hash: number;
    constructor();
    static cachedDigest(): HashDigest;
    reset(): this;
    get(): number;
    add(v: number | string | number[] | boolean | Vector2 | Vector3 | Vector4): this;
}
export declare class MapIter<K extends KeystrObject, V> implements Iterator<[K, V]> {
    ret: IteratorResult<[K, V]>;
    value: [K, V];
    i: number;
    map: map<K, V>;
    done: boolean;
    constructor(ownermap: map<K, V>);
    finish(): void;
    next(): IteratorResult<[K, V]>;
    return(): IteratorResult<[K, V]>;
    reset(): this;
}
export declare class map<K extends KeystrObject, V> {
    _items: Record<string, number>;
    _list: unknown[];
    size: number;
    iterstack: MapIter<K, V>[];
    itercur: number;
    freelist: number[];
    constructor();
    has(key: K): boolean;
    set(key: K, v: V): void;
    keys(): Generator<K>;
    values(): Generator<V>;
    get(k: K): V | undefined;
    delete(k: K): boolean;
    [Symbol.iterator](): MapIter<K, V>;
}
export declare class IDMap<T> extends Array<T | object | undefined> {
    _keys: Set<number>;
    size: number;
    constructor();
    has(id: number): boolean;
    set(id: number, val: T): boolean;
    get(id: number): T | undefined;
    delete(id: number): boolean;
    keys(): Generator<number>;
    values(): Generator<T>;
    [Symbol.iterator](): Generator<[number, T]>;
}
export declare class MinHeapQueue<T> {
    heap: (number | T | undefined)[];
    freelist: number[];
    length: number;
    end: number;
    constructor(iter?: Iterable<T>, iterw?: Iterable<number>);
    push(e: T, w: number): void;
    pop(): T | undefined;
}
export declare class Queue<T> {
    initialSize: number;
    queue: (T | undefined)[];
    a: number;
    b: number;
    length: number;
    constructor(n?: number);
    enqueue(item: T): void;
    clear(clearData?: boolean): this;
    dequeue(): T | undefined;
}
export declare class ArrayPool {
    pools: Map<number, cachering<unknown[]>>;
    map: (cachering<unknown[]> | undefined)[];
    constructor();
    get<T>(n: number, clear?: boolean): T[];
}
/** jsFiddle-friendly */
export declare class DivLogger {
    elemId: string;
    elem: HTMLElement | undefined;
    lines: string[];
    maxLines: number;
    constructor(elemId: string, maxLines?: number);
    push(line: string): void;
    update(): void;
    toString(obj: unknown, depth?: number): string;
}
export declare const PendingTimeoutPromises: Set<TimeoutPromise<unknown>>;
type AcceptFn<T> = (value: T) => void;
type RejectFn = (reason?: unknown) => void;
export declare class TimeoutPromise<T = unknown> {
    silent: boolean;
    timeout: number;
    time: number;
    rejected: boolean;
    _promise: Promise<T>;
    _accept: AcceptFn<T>;
    _reject: RejectFn;
    constructor(callback?: (accept: AcceptFn<T>, reject: RejectFn) => void, timeout?: number, silent?: boolean);
    _accept2(val: T): void;
    static wrapPromise<U>(promise: Promise<U>, timeout: number | undefined, callback: AcceptFn<U>): TimeoutPromise<U>;
    _reject2(error: unknown): void;
    then(callback: (val: T) => unknown): this;
    catch(callback: (error: unknown) => void): this;
    finally(callback: () => void): this;
    get bad(): boolean;
}
import { StructReader } from "./nstructjs_es6.js";
import type { Vector2, Vector3, Vector4 } from "./vectormath.js";
export declare function compress(data: string): Uint8Array;
export declare function decompress(data: DataView | ArrayBuffer | Uint8Array): string;
export declare function undefinedForGC<T>(): T;
export {};
//# sourceMappingURL=util.d.ts.map