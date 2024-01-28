import {Area, IAreaConstructor, IAreaDef} from "./ScreenArea";

export declare class AreaWrangler {
  /*Yeek this is particularly evil, it creates a context
  * that can be used by popups with the original context
  * area stack intact of the elements that spawned them.*/
  makeSafeContext(ctx: any): any;

  copyTo(b: this);

  copy(b: this): this;

  _checkWrangler(ctx: any): boolean;

  reset(): this;

  static findInstance(): this;

  lock(): this;

  unlock(): this;

  static lock(): this;

  static unlock(): this;

  push(type: IAreaConstructor, area: Area, pushLastRef?: boolean): void;

  updateLastRef(type: IAreaConstructor, area: Area): void;

  pop(type: IAreaConstructor, area: Area): void;

  getLastArea<T extends Area = Area>(type: IAreaConstructor<T>): T | undefined

}

export declare const contextWrangler: AreaWrangler;
