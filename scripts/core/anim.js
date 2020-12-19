import {Vector2, Matrix4, Quat, Vector3, Vector4} from '../path-controller/util/vectormath.js';
import * as math from '../path-controller/util/math.js'
import {color2css, css2color, parsepx} from './ui_theme.js';
import {Curve1D, getCurve} from "../path-controller/curve/curve1d.js";
import * as util from '../path-controller/util/util.js';

class Task {
  constructor(taskcb) {
    this.task = taskcb;
    this.start = util.time_ms();
    this.done = false;
  }
}

export class AnimManager {
  constructor() {
    this.tasks = [];
    this.timer = undefined;

    //all animation tasks that last longer then 10 seconds are terminated
    this.timeOut = 10*1000.0;
  }

  stop() {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  add(task) {
    this.tasks.push(new Task(task));
  }

  remove(task) {
    for (let t of this.tasks) {
      if (t.task === task) {
        t.dead = true;
        this.tasks.remove(t);
        return;
      }
    }
  }

  start() {
    this.timer = window.setInterval(() => {
      for (let t of this.tasks) {
        try {
          t.task();
        } catch (error) {
          t.done = true;
          util.print_stack(error);
        }

        if (util.time_ms() - t.start > this.timeOut) {
          t.dead = true;
        }
      }

      for (let i=0; i<this.tasks.length; i++) {
        if (this.tasks[i].done) {
          let t = this.tasks[i];
          this.tasks.remove(t);
          i--;

          try {
            if (t.task.onend) {
              t.task.onend();
            }
          } catch (error) {
            util.print_stack(error);
          }
        }
      }
    }, 1000/40.0);
  }
}


export const manager = new AnimManager();
manager.start();

export class AbstractCommand {
  constructor() {
    this.cbs = [];
    this.end_cbs = [];
  }

  start(animator, done) {

  }

  exec(animator, done) {

  }
}

export class WaitCommand extends AbstractCommand {
  constructor(ms) {
    super();
    this.ms = ms;
  }

  start(animator, done) {
    this.time = animator.time;
  }

  exec(animator, done) {
    if (animator.time - this.time > this.ms) {
      done();
    }
  }
}

export class GoToCommand extends AbstractCommand {
  constructor(obj, key, value, time, curve="ease") {
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

  start(animator, done) {
    this.time = animator.time;

    let value = this.object[this.key];

    if (Array.isArray(value)) {
      this.startValue = util.list(value);
    } else {
      this.startValue = value;
    }
  }

  exec(animator, done) {
    let t = animator.time - this.time;
    let ms = this.ms;

    if (t > ms) {
      done();
      t = ms;
    }

    t /= ms;

    t = this.curve.evaluate(t);

    if (Array.isArray(this.startValue)) {
      let value = this.object[this.key];

      for (let i=0; i<this.startValue.length; i++) {
        if (value[i] === undefined || this.value[i] === undefined) {
          continue;
        }

        value[i] = this.startValue[i] + (this.value[i] - this.startValue[i]) * t;
      }
    } else {
      this.object[this.key] = this.startValue + (this.value - this.startValue) * t;

    }
  }
}

export class SetCommand extends AbstractCommand {
  constructor(obj, key, val) {
    super();

    this.object = obj;
    this.key = key;
    this.value = val;
  }

  start(animator, done) {
    this.object[key] = val;
    done();
  }
}

export class Command {
  constructor(type, args) {
    this.args = args;
    this.cbs = [];
  }
}

export class Animator {
  constructor(owner, method = "update") {
    this.on_tick = this.on_tick.bind(this);
    this.on_tick.onend = () => {
      if (this.onend) {
        this.onend();
      }
    }

    this.commands = [];
    this.owner = owner;
    this._done = false;
    this.method = method;
    this.onend = null;
    this.first = true;

    this.time = 0.0;
    this.last = util.time_ms();

    this.bind(owner);
  }

  bind(owner) {
    this._done = false;
    this.owner = owner;
    //this.owner[this.method].after(this.on_tick);
    manager.add(this.on_tick);
  }

  wait(ms) {
    this.commands.push(new WaitCommand(ms));
    return this;
  }

  goto(key, val, timeMs, curve = "ease") {
    let cmd = new GoToCommand(this.owner, key, val, timeMs, curve);
    this.commands.push(cmd);
    return this;
  }

  set(key, val, time) {
    let cmd = new SetCommand(this.owner, key, val);
    this.commands.push(cmd);
    return this;
  }

  while(cb) {
    this.commands[this.commands.length - 1].cbs.push(cb);
    return this;
  }

  then(cb) {
    this.commands[this.commands.length-1].end_cbs.push(cb);
    return this;
  }

  end() {
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

  on_tick() {
    if (this._done) {
      throw new Error("animation wasn't properly cleaned up");
    }

    let dt = util.time_ms() - this.last;
    this.time += dt;
    this.last = util.time_ms();

    if (this.commands.length === 0) {
      this.end();
      return
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
      util.print_stack(error);
    }

    for (let cb of this.commands[0].cbs) {
      try {
        cb();
      } catch (error) {
        util.print_stack(error);
      }
    }

    if (done) {
      for (let cb of this.commands[0].end_cbs) {
        try {
          cb();
        } catch (error) {
          util.print_stack(error);
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
