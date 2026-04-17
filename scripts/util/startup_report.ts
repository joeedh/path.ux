import * as util from "./util";

export function startupReport(...args: unknown[]): void {
  let s = "";
  for (const arg of args) {
    s += arg + " ";
  }

  console.log(util.termColor(s, "green"));
}
