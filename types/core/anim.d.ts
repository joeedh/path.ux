import type { CurveTypeData } from "../path-controller/curve/curve1d_base.js";
type TaskCallback = (() => void) & {
    onend?: () => void;
};
declare class Task {
    task: TaskCallback;
    start: number;
    done: boolean;
    dead: boolean;
    constructor(taskcb: TaskCallback);
}
export declare class AnimManager {
    tasks: Task[];
    timer: number | undefined;
    timeOut: number;
    constructor();
    stop(): void;
    add(task: TaskCallback): void;
    remove(task: TaskCallback): void;
    start(): void;
}
export declare const manager: AnimManager;
export declare class AbstractCommand {
    cbs: (() => void)[];
    end_cbs: (() => void)[];
    constructor();
    start(animator: Animator, done: () => void): void;
    exec(animator: Animator, done: () => void): void;
}
export declare class WaitCommand extends AbstractCommand {
    ms: number;
    time: number;
    constructor(ms: number);
    start(animator: Animator, done: () => void): void;
    exec(animator: Animator, done: () => void): void;
}
export declare class GoToCommand extends AbstractCommand {
    object: Record<string, unknown>;
    key: string;
    value: unknown;
    ms: number;
    curve: CurveTypeData;
    time: number;
    startValue: unknown;
    constructor(obj: Record<string, unknown>, key: string, value: unknown, time: number, curve?: string | CurveTypeData);
    start(animator: Animator, done: () => void): void;
    exec(animator: Animator, done: () => void): void;
}
export declare class SetCommand extends AbstractCommand {
    object: Record<string, unknown>;
    key: string;
    value: unknown;
    constructor(obj: Record<string, unknown>, key: string, val: unknown);
    start(animator: Animator, done: () => void): void;
}
export declare class Command {
    args: unknown;
    cbs: (() => void)[];
    constructor(type: string, args: unknown);
}
export declare class Animator {
    on_tick: TaskCallback;
    commands: AbstractCommand[];
    owner: Record<string, unknown>;
    _done: boolean;
    method: string;
    onend: (() => void) | null;
    first: boolean;
    time: number;
    last: number;
    constructor(owner: Record<string, unknown>, method?: string);
    bind(owner: Record<string, unknown>): void;
    wait(ms: number): this;
    goto(key: string, val: unknown, timeMs: number, curve?: string | CurveTypeData): this;
    set(key: string, val: unknown, time?: number): this;
    /** Call this while the current command is still being executed. */
    while(cb: () => void): this;
    then(cb: () => void): this;
    end(): void;
    private _onTick;
}
export {};
//# sourceMappingURL=anim.d.ts.map