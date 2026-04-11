type StructJSONValue = any;
declare class token {
    type: string;
    value: string;
    lexpos: number;
    lineno: number;
    col: number;
    lexer: lexer;
    parser: parser | undefined;
    constructor(type: string, val: string, lexpos: number, lineno: number, lex: lexer, prs: parser | undefined, col: number);
    toString(): string;
}
type TokFunc = (t: token) => token | undefined;
declare class tokdef {
    name: string;
    re: RegExp | undefined;
    func: TokFunc | undefined;
    example: string | undefined;
    constructor(name: string, regexpr?: RegExp, func?: TokFunc, example?: string);
}
declare class PUTIL_ParseError extends Error {
    constructor(msg: string);
}
type LexerErrFunc = (lex: lexer) => boolean;
declare class lexer {
    tokdef: tokdef[];
    tokens: token[];
    lexpos: number;
    lexdata: string;
    colmap: number[] | undefined;
    lineno: number;
    printTokens: boolean;
    linestart: number;
    errfunc: LexerErrFunc | undefined;
    linemap: number[] | undefined;
    tokints: Record<string, number>;
    statestack: [string, unknown][];
    states: Record<string, [tokdef[], LexerErrFunc | undefined]>;
    statedata: unknown;
    peeked_tokens: token[];
    logger: (...args: unknown[]) => void;
    constructor(tokdef_arr: tokdef[], errfunc?: LexerErrFunc);
    add_state(name: string, tokdef_arr: tokdef[], errfunc?: LexerErrFunc): void;
    tok_int(_name: string): void;
    push_state(state: string, statedata: unknown): void;
    pop_state(): void;
    input(str: string): void;
    error(): void;
    peek(): token | undefined;
    peeknext(): token | undefined;
    at_end(): boolean;
    next(ignore_peek?: boolean): token | undefined;
}
type ParserErrFunc = (tok: token | undefined) => boolean;
declare class parser {
    lexer: lexer;
    errfunc: ParserErrFunc | undefined;
    start: ((p: parser) => unknown) | undefined;
    logger: (...args: unknown[]) => void;
    constructor(lex: lexer, errfunc?: ParserErrFunc);
    parse(data?: string, err_on_unconsumed?: boolean): unknown;
    input(data: string): void;
    error(tokenArg: token | undefined, msg?: string): void;
    peek(): token | undefined;
    peeknext(): token | undefined;
    next(): token | undefined;
    optional(type: string): boolean;
    at_end(): boolean;
    expect(type: string, msg?: string): string;
}
declare var struct_parseutil: Readonly<{
    __proto__: null;
    token: typeof token;
    tokdef: typeof tokdef;
    PUTIL_ParseError: typeof PUTIL_ParseError;
    lexer: typeof lexer;
    parser: typeof parser;
}>;
interface StructField {
    name: string;
    type: StructType;
    set: string | undefined;
    get: string | undefined;
    comment: string;
}
interface StructType {
    type: number;
    data?: unknown;
    jsonKeyword?: string;
}
declare class NStruct {
    fields: StructField[];
    id: number;
    name: string;
    constructor(name: string);
}
declare function stripComments(buf: string): string;
declare var struct_parser: Readonly<{
    __proto__: null;
    NStruct: typeof NStruct;
    StructEnum: {
        readonly INT: 0;
        readonly FLOAT: 1;
        readonly DOUBLE: 2;
        readonly STRING: 7;
        readonly STATIC_STRING: 8;
        readonly STRUCT: 9;
        readonly TSTRUCT: 10;
        readonly ARRAY: 11;
        readonly ITER: 12;
        readonly SHORT: 13;
        readonly BYTE: 14;
        readonly BOOL: 15;
        readonly ITERKEYS: 16;
        readonly UINT: 17;
        readonly USHORT: 18;
        readonly STATIC_ARRAY: 19;
        readonly SIGNED_BYTE: 20;
        readonly OPTIONAL: 21;
    };
    ArrayTypes: Set<number>;
    ValueTypes: Set<number>;
    StructTypes: Record<string, number>;
    StructTypeMap: Record<number, string>;
    stripComments: typeof stripComments;
    struct_parse: parser & {
        input(str: string): void;
        at_end(): boolean;
        peek(): token | undefined;
    };
}>;
/** dead file */
declare var struct_typesystem: Readonly<{
    __proto__: null;
}>;
declare function setBinaryEndian(mode: boolean): void;
declare class unpack_context {
    i: number;
    constructor();
}
declare function pack_byte(array: number[], val: number): void;
declare function pack_sbyte(array: number[], val: number): void;
declare function pack_bytes(array: number[], bytes: number[] | Uint8Array): void;
declare function pack_int(array: number[], val: number): void;
declare function pack_uint(array: number[], val: number): void;
declare function pack_ushort(array: number[], val: number): void;
declare function pack_float(array: number[], val: number): void;
declare function pack_double(array: number[], val: number): void;
declare function pack_short(array: number[], val: number): void;
declare function encode_utf8(arr: number[], str: string): void;
declare function decode_utf8(arr: number[]): string;
declare function test_utf8(): boolean;
declare function pack_static_string(data: number[], str: string, length: number): void;
declare function pack_string(data: number[], str: string): void;
declare function unpack_bytes(dview: DataView, uctx: unpack_context, len: number): DataView;
declare function unpack_byte(dview: DataView, uctx: unpack_context): number;
declare function unpack_sbyte(dview: DataView, uctx: unpack_context): number;
declare function unpack_int(dview: DataView, uctx: unpack_context): number;
declare function unpack_uint(dview: DataView, uctx: unpack_context): number;
declare function unpack_ushort(dview: DataView, uctx: unpack_context): number;
declare function unpack_float(dview: DataView, uctx: unpack_context): number;
declare function unpack_double(dview: DataView, uctx: unpack_context): number;
declare function unpack_short(dview: DataView, uctx: unpack_context): number;
declare function unpack_string(data: DataView, uctx: unpack_context): string;
declare function unpack_static_string(data: DataView, uctx: unpack_context, length: number): string;
declare var struct_binpack: Readonly<{
    __proto__: null;
    readonly STRUCT_ENDIAN: boolean;
    setBinaryEndian: typeof setBinaryEndian;
    temp_dataview: DataView<ArrayBuffer>;
    uint8_view: Uint8Array<ArrayBuffer>;
    unpack_context: typeof unpack_context;
    pack_byte: typeof pack_byte;
    pack_sbyte: typeof pack_sbyte;
    pack_bytes: typeof pack_bytes;
    pack_int: typeof pack_int;
    pack_uint: typeof pack_uint;
    pack_ushort: typeof pack_ushort;
    pack_float: typeof pack_float;
    pack_double: typeof pack_double;
    pack_short: typeof pack_short;
    encode_utf8: typeof encode_utf8;
    decode_utf8: typeof decode_utf8;
    test_utf8: typeof test_utf8;
    pack_static_string: typeof pack_static_string;
    pack_string: typeof pack_string;
    unpack_bytes: typeof unpack_bytes;
    unpack_byte: typeof unpack_byte;
    unpack_sbyte: typeof unpack_sbyte;
    unpack_int: typeof unpack_int;
    unpack_uint: typeof unpack_uint;
    unpack_ushort: typeof unpack_ushort;
    unpack_float: typeof unpack_float;
    unpack_double: typeof unpack_double;
    unpack_short: typeof unpack_short;
    unpack_string: typeof unpack_string;
    unpack_static_string: typeof unpack_static_string;
}>;
/** Structable class interface */
export interface StructableClass {
    STRUCT?: string;
    structName?: string;
    name: string;
    prototype: any;
    newSTRUCT?: (loader: StructReader) => unknown;
    fromSTRUCT?: (loader: StructReader) => unknown;
    new (...args: any[]): unknown;
    __proto__?: StructableClass;
}
/** The loader callback type */
export type StructReader<T = any> = (obj: T) => void;
declare var manager: STRUCT;
declare class JSONError extends Error {
}
declare function setTruncateDollarSign(v: boolean): void;
declare function _truncateDollarSign(s: string): string;
declare function setWarningMode(t: number): void;
declare function setDebugMode(t: number): void;
interface STRUCTKeywords {
    script: string;
    name: string;
    load: string;
    new: string;
    after?: string;
    from: string;
}
declare class STRUCT {
    idgen: number;
    allowOverriding: boolean;
    structs: Record<string, NStruct>;
    struct_cls: Record<string, StructableClass>;
    struct_ids: Record<number, NStruct>;
    compiled_code: Record<string, Function>;
    null_natives: Record<string, number>;
    jsonUseColors: boolean;
    jsonBuf: string;
    formatCtx: {
        addComments?: boolean;
        validate?: boolean;
    };
    jsonLogger: (...args: unknown[]) => void;
    static keywords: STRUCTKeywords;
    constructor();
    static inherit(child: StructableClass, parent: StructableClass, structName?: string): string;
    /** invoke loadSTRUCT methods on parent objects.  note that
     reader() is only called once.  it is called however.*/
    static Super(obj: any, reader: StructReader): void;
    /** deprecated.  used with old fromSTRUCT interface. */
    static chain_fromSTRUCT(cls: StructableClass, reader: StructReader): unknown;
    static formatStruct(stt: NStruct, internal_only?: boolean, no_helper_js?: boolean): string;
    static fmt_struct(stt: NStruct, internal_only?: boolean, no_helper_js?: boolean, addComments?: boolean): string;
    static setClassKeyword(keyword: string, nameKeyword?: string): void;
    define_null_native(name: string, cls: StructableClass): void;
    validateStructs(onerror?: (msg: string, stt: NStruct, field: StructField) => void): void;
    forEach(func: (stt: NStruct) => void, thisvar?: unknown): void;
    parse_structs(buf: string, defined_classes?: StructableClass[] | STRUCT): void;
    /** adds all structs referenced by cls inside of srcSTRUCT
     *  to this */
    registerGraph(srcSTRUCT: STRUCT, cls: StructableClass): void;
    mergeScripts(child: string, parent: string): string;
    inlineRegister(cls: StructableClass, structScript: string): string;
    register(cls: StructableClass, structName?: string): void;
    unregister(cls: StructableClass): void;
    add_class(cls: StructableClass, structName?: string): void;
    isRegistered(cls: StructableClass): boolean;
    get_struct_id(id: number): NStruct;
    get_struct(name: string): NStruct;
    get_struct_cls(name: string): StructableClass;
    _env_call(code: string, obj: unknown, env?: [unknown, unknown][]): unknown;
    write_struct(data: number[], obj: unknown, stt: NStruct): void;
    /**
     @param data : array to write data into,
     @param obj  : structable object
     */
    write_object(data: number[] | undefined, obj: any): number[];
    /**
     Read an object from binary data
  
     @param data : DataView or Uint8Array instance
     @param cls_or_struct_id : Structable class
     @param uctx : internal parameter
     @return Instance of cls_or_struct_id
     */
    readObject<T, ARGS extends unknown[]>(data: DataView | Uint8Array | Uint8ClampedArray | number[], cls_or_struct_id: (new (...args: ARGS) => T) | number, uctx?: unpack_context): T;
    /**
     @param data array to write data into,
     @param obj structable object
     */
    writeObject(data: number[], obj: any): number[];
    writeJSON(obj: any, stt?: NStruct): StructJSONValue;
    /**
     @param data : DataView or Uint8Array instance
     @param cls_or_struct_id : Structable class
     @param uctx : internal parameter
     */
    read_object(data: DataView | number[], cls_or_struct_id: StructableClass | number, uctx?: unpack_context, objInstance?: unknown): any;
    validateJSON(json: any, cls_or_struct_id: StructableClass | NStruct | number, useInternalParser?: boolean, useColors?: boolean, consoleLoggerFn?: (...args: unknown[]) => void, _abstractKey?: string): boolean;
    validateJSONIntern(json: any, cls_or_struct_id: StructableClass | NStruct | number, _abstractKey?: string): boolean;
    readJSON(json: any, cls_or_struct_id: StructableClass | NStruct | number, objInstance?: any): any;
    formatJSON_intern(json: any, stt: NStruct, field?: StructField, tlvl?: number): string;
    formatJSON(json: any, cls: StructableClass, addComments?: boolean, validate?: boolean): string;
}
declare function deriveStructManager(keywords?: STRUCTKeywords): typeof STRUCT;
/**
 * Write all defined structs out to a string.
 *
 * @param nManager STRUCT instance, defaults to nstructjs.manager
 * @param include_code include save code snippets
 * */
declare function write_scripts(nManager?: STRUCT, include_code?: boolean): string;
interface VersionObj {
    major: number;
    minor: number;
    micro: number;
}
declare function versionToInt(v: string | number[] | VersionObj): number;
declare function versionCoerce(v: string | number[] | VersionObj | unknown): VersionObj;
declare function versionLessThan(a: string | number[] | VersionObj, b: string | number[] | VersionObj): boolean;
declare class FileParams {
    magic: string;
    ext: string;
    blocktypes: string[];
    version: VersionObj;
    constructor();
}
declare class Block {
    type: string;
    data: unknown;
    constructor(type?: string, data?: unknown);
}
declare class FileeError extends Error {
}
declare class FileHelper {
    version: VersionObj;
    blocktypes: string[];
    magic: string;
    ext: string;
    struct: STRUCT | undefined;
    unpack_ctx: unpack_context | undefined;
    blocks: Block[];
    constructor(params?: FileParams | Partial<FileParams>);
    read(dataview: DataView): Block[];
    doVersions(old: string | number[] | VersionObj): void;
    write(blocks: Block[]): DataView;
    writeBase64(blocks: Block[]): string;
    makeBlock(type: string, data: unknown): Block;
    readBase64(base64: string): Block[];
}
declare var struct_filehelper: Readonly<{
    __proto__: null;
    versionToInt: typeof versionToInt;
    versionCoerce: typeof versionCoerce;
    versionLessThan: typeof versionLessThan;
    FileParams: typeof FileParams;
    Block: typeof Block;
    FileeError: typeof FileeError;
    FileHelper: typeof FileHelper;
}>;
/** truncate webpack mangled names. defaults to true
 *  so Mesh$1 turns into Mesh */
declare function truncateDollarSign(value?: boolean): void;
declare function validateStructs(onerror?: (msg: string, stt: NStruct, field: StructField) => void): void;
/**
 true means little endian, false means big endian
 */
declare function setEndian(mode: boolean): boolean;
declare function consoleLogger(...args: unknown[]): void;
/** Validate json
 *
 * @param json
 * @param cls
 * @param useInternalParser If true (the default) an internal parser will be used that generates nicer error messages
 * @param printColors
 * @param logger
 * @returns {*}
 */
declare function validateJSON(json: any, cls: StructableClass, useInternalParser?: boolean, printColors?: boolean, logger?: (...args: unknown[]) => void): boolean;
declare function getEndian(): boolean;
declare function setAllowOverriding(t: boolean): boolean;
declare function isRegistered(cls: StructableClass): boolean;
/** Register a class inline.
 *
 * Note: No need to use nstructjs.inherit,
 * inheritance is handled for you.  Unlike
 * nstructjs.inherit fields can be properly
 * overridden in the child class without
 * being written twice.
 *
 * class Test {
 *  test = 0;
 *
 *  static STRUCT = nstructjs.inlineRegister(this, `
 *  namespace.Test {
 *    test : int;
 *  }
 *  `);
 * }
 **/
declare function inlineRegister(cls: StructableClass | Function, structScript: string): string;
/** Register a class with nstructjs **/
declare function register(cls: StructableClass | Function, structName?: string): void;
declare function unregister(cls: StructableClass | Function): void;
declare function inherit(child: StructableClass | Function, parent: StructableClass | Function, structName?: string): string;
/**
 @param data : DataView
 */
declare function readObject<T = any>(data: DataView | Uint8Array | Uint8ClampedArray | number[], cls: StructableClass | number, __uctx?: unpack_context): T;
/**
 @param data : Array instance to write bytes to
 */
declare function writeObject(data: number[], obj: any): number[];
declare function writeJSON(obj: any): StructJSONValue;
declare function formatJSON(json: any, cls: StructableClass, addComments?: boolean, validate?: boolean): string;
declare function readJSON(json: any, class_or_struct_id: StructableClass | NStruct | number): unknown;
export { JSONError, STRUCT, _truncateDollarSign, struct_binpack as binpack, consoleLogger, deriveStructManager, struct_filehelper as filehelper, formatJSON, getEndian, inherit, inlineRegister, isRegistered, manager, struct_parser as parser, struct_parseutil as parseutil, readJSON, readObject, register, setAllowOverriding, setDebugMode, setEndian, setTruncateDollarSign, setWarningMode, truncateDollarSign, struct_typesystem as typesystem, unpack_context, unregister, validateJSON, validateStructs, writeJSON, writeObject, write_scripts, };
//# sourceMappingURL=nstructjs_es6.d.ts.map