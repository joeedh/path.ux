import { Vector2, Matrix4, Quat, Vector3, Vector4 } from "../path-controller/util/vectormath";
import * as math from "../path-controller/util/math";
import { color2css, css2color, parsepx } from "./ui_theme";
import { Curve1D, getCurve } from "../path-controller/curve/curve1d";
import type { CurveTypeData } from "../path-controller/curve/curve1d_base";
import * as util from "../path-controller/util/util";

type TaskCallback = (() => void) & { onend?: () => void };

class Task {
  task: TaskCallback;
  start: number;
  done: boolean;
  dead: boolean;

  constructor(taskcb: TaskCallback) {
    this.task = taskcb;
    this.start = util.time_ms();
    this.done = false;
    this.dead = false;
  }
}

export class AnimManager {
  tasks: Task[];
  timer: number | undefined;
  timeOut: number;

  constructor() {
    this.tasks = [];
    this.timer = undefined;

    //all animation tasks that last longer then 10 seconds are terminated
    this.timeOut = 10 * 1000.0;
  }

  stop(): void {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  add(task: TaskCallback): void {
    this.tasks.push(new Task(task));
  }

  remove(task: TaskCallback): void {
    for (let t of this.tasks) {
      if (t.task === task) {
        t.dead = true;
        this.tasks.remove(t);
        return;
      }
    }
  }

  start(): void {
    this.timer = window.setInterval(() => {
      for (let t of this.tasks) {
        try {
          t.task();
        } catch (error) {
          t.done = true;
          util.print_stack(error as Error);
        }

        if (util.time_ms() - t.start > this.timeOut) {
          t.dead = true;
        }
      }

      for (let i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].done) {
          let t = this.tasks[i];
          this.tasks.remove(t);
          i--;

          try {
            if (t.task.onend) {
              t.task.onend();
            }
          } catch (error) {
            util.print_stack(error as Error);
          }
        }
      }
    }, 1000 / 40.0);
  }
}

export const manager = new AnimManager();
manager.start();

export class AbstractCommand {
  cbs: (() => void)[];
  end_cbs: (() => void)[];

  constructor() {
    this.cbs = [];
    this.end_cbs = [];
  }

  start(animator: Animator, done: () => void): void {}

  exec(animator: Animator, done: () => void): void {}
}

export class WaitCommand extends AbstractCommand {
  ms: number;
  time!: number;

  constructor(ms: number) {
    super();
    this.ms = ms;
  }

  start(animator: Animator, done: () => void): void {
    this.time = animator.time;
  }

  exec(animator: Animator, done: () => void): void {
    if (animator.time - this.time > this.ms) {
      done();
    }
  }
}

export class GoToCommand extends AbstractCommand {
  object: Record<string, unknown>;
  key: string;
  value: unknown;
  ms: number;
  curve: CurveTypeData;
  time!: number;
  startValue!: unknown;

  constructor(
    obj: Record<string, unknown>,
    key: string,
    value: unknown,
    time: number,
    curve: string | CurveTypeData = "ease"
  ) {
    super();

    this.object = obj;
    this.key = key;
    this.value = value;
    this.ms = time;

    if (typeof curve === "string") {
      this.curve = new (getCurve(curve))();
    } else {
      this.curve = curve;
    }
  }

  start(animator: Animator, done: () => void): void {
    this.time = animator.time;

    let value = this.object[this.key];

    if (Array.isArray(value)) {
      this.startValue = util.list(value);
    } else {
      this.startValue = value;
    }
  }

  exec(animator: Animator, done: () => void): void {
    let t = animator.time - this.time;
    let ms = this.ms;

    if (t > ms) {
      done();
      t = ms;
    }

    t /= ms;

    t = this.curve.evaluate(t);

    if (Array.isArray(this.startValue)) {
      let value = this.object[this.key] as number[];
      let sv = this.startValue as number[];
      let tv = this.value as number[];

      for (let i = 0; i < sv.length; i++) {
        if (value[i] === undefined || tv[i] === undefined) {
          continue;
        }

        value[i] = sv[i] + (tv[i] - sv[i]) * t;
      }
    } else {
      this.object[this.key] =
        (this.startValue as number) + ((this.value as number) - (this.startValue as number)) * t;
    }
  }
}

export class SetCommand extends AbstractCommand {
  object: Record<string, unknown>;
  key: string;
  value: unknown;

  constructor(obj: Record<string, unknown>, key: string, val: unknown) {
    super();

    this.object = obj;
    this.key = key;
    this.value = val;
  }

  start(animator: Animator, done: () => void): void {
    this.object[this.key] = this.value;
    done();
  }
}

export class Command {
  args: unknown;
  cbs: (() => void)[];

  constructor(type: string, args: unknown) {
    this.args = args;
    this.cbs = [];
  }
}

export class Animator {
  on_tick: TaskCallback;
  commands: AbstractCommand[];
  owner: Record<string, unknown>;
  _done: boolean;
  method: string;
  onend: (() => void) | null;
  first: boolean;
  time: number;
  last: number;

  constructor(owner: Record<string, unknown>, method = "update") {
    this.commands = [];
    this.owner = owner;
    this._done = false;
    this.method = method;
    this.onend = null;
    this.first = true;

    this.time = 0.0;
    this.last = util.time_ms();

    this.on_tick = this._onTick.bind(this);
    this.on_tick.onend = () => {
      if (this.onend) {
        this.onend();
      }
    };

    this.bind(owner);
  }

  bind(owner: Record<string, unknown>): void {
    this._done = false;
    this.owner = owner;
    //this.owner[this.method].after(this.on_tick);
    manager.add(this.on_tick);
  }

  wait(ms: number): this {
    this.commands.push(new WaitCommand(ms));
    return this;
  }

  goto(key: string, val: unknown, timeMs: number, curve: string | CurveTypeData = "ease"): this {
    let cmd = new GoToCommand(this.owner, key, val, timeMs, curve);
    this.commands.push(cmd);
    return this;
  }

  set(key: string, val: unknown, time?: number): this {
    let cmd = new SetCommand(this.owner, key, val);
    this.commands.push(cmd);
    return this;
  }

  /** Call this while the current command is still being executed. */
  while(cb: () => void): this {
    this.commands[this.commands.length - 1].cbs.push(cb);
    return this;
  }

  then(cb: () => void): this {
    this.commands[this.commands.length - 1].end_cbs.push(cb);
    return this;
  }

  end(): void {
    if (this._done) {
      return;
    }

    this._done = true;
    manager.remove(this.on_tick);
    //this.owner.update.remove(this.on_tick);

    if (this.onend) {
      this.onend();
    }
  }

  private _onTick(): void {
    if (this._done) {
      throw new Error("animation wasn't properly cleaned up");
    }

    let dt = util.time_ms() - this.last;
    this.time += dt;
    this.last = util.time_ms();

    if (this.commands.length === 0) {
      this.end();
      return;
    }

    let cmd = this.commands[0];
    let done = false;

    function donecb() {
      done = true;
    }

    if (this.first) {
      this.first = false;
      //console.log(cmd, cmd.start)
      cmd.start(this, donecb);
    }

    try {
      cmd.exec(this, donecb);
    } catch (error) {
      done = true;
      util.print_stack(error as Error);
    }

    for (let cb of this.commands[0].cbs) {
      try {
        cb();
      } catch (error) {
        util.print_stack(error as Error);
      }
    }

    if (done) {
      for (let cb of this.commands[0].end_cbs) {
        try {
          cb();
        } catch (error) {
          util.print_stack(error as Error);
        }
      }
      while (this.commands.length > 0) {
        this.commands.shift();

        done = false;

        if (this.commands.length > 0) {
          this.commands[0].start(this, donecb);
        }

        if (!done) {
          break;
        }
      }
    }
  }
}
