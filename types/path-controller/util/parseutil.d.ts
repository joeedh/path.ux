export type TokFunc = (t: token) => token | undefined | void;
export type LexerErrFunc = (ctx: lexer) => boolean;
export type ParserErrFunc = (tok: token | undefined) => boolean;
export declare class token {
    type: string;
    value: string;
    lexpos: number;
    lexlen: number;
    lineno: number;
    lexer: lexer;
    parser: parser | undefined;
    constructor(type: string, val: string, lexpos: number, lexlen: number, lineno: number, lexer: lexer, parser: parser | undefined);
    setValue(val: string): this;
    toString(): string;
}
export declare class tokdef {
    name: string;
    re: RegExp | undefined;
    func: TokFunc | undefined;
    constructor(name: string, regexpr?: RegExp, func?: TokFunc);
}
export declare class PUTLParseError extends Error {
}
type LexerState = [tokdef[], LexerErrFunc | undefined];
/**
 * `errfunc` is optional.  It requires
 * a function that takes one param, lexer,
 * and returns true if the lexer
 * should propagate an error when an error
 * has happened
 */
export declare class lexer {
    tokdef: tokdef[];
    tokens: token[];
    lexpos: number;
    lexdata: string;
    lineno: number;
    errfunc: LexerErrFunc | undefined;
    tokints: Record<string, number>;
    print_tokens: boolean;
    print_debug: boolean;
    statestack: [string, number][];
    states: Record<string, LexerState>;
    statedata: number;
    peeked_tokens: token[];
    constructor(tokdef: tokdef[], errfunc?: LexerErrFunc);
    copy(): lexer;
    add_state(name: string, tokdef: tokdef[], errfunc?: LexerErrFunc): void;
    tok_int(_name: string): void;
    push_state(state: string, statedata: number): void;
    pop_state(): void;
    input(str: string): void;
    error(): void;
    peek(): token | undefined;
    peek_i(i: number): token | undefined;
    at_end(): boolean;
    next(ignore_peek?: boolean): token | undefined;
}
export declare function getTraceBack(limit?: number, start?: number): string;
export type StartFunc = (p: parser) => unknown;
export declare class parser {
    lexer: lexer;
    errfunc: ParserErrFunc | undefined;
    start: StartFunc | undefined;
    userdata: unknown;
    constructor(lexer: lexer, errfunc?: ParserErrFunc);
    copy(): parser;
    parse(data?: string, err_on_unconsumed?: boolean): unknown;
    input(data: string): void;
    error(tok: token | undefined, msg?: string): void;
    peek(): token | undefined;
    peek_i(i: number): token | undefined;
    peeknext(): token | undefined;
    next(): token | undefined;
    optional(type: string): boolean;
    at_end(): boolean;
    expect(type: string, msg?: string): string;
}
export {};
//# sourceMappingURL=parseutil.d.ts.map