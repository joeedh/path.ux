//methods to forward to this.contents
export let defaultForwardKeys = [
  "row",
  "col",
  "strip",
  "noteframe",
  "helppicker",
  "vecpopup",
  "tabs",
  "table",
  "menu",
  "listbox",
  "panel",
  "pathlabel",
  "label",
  "listenum",
  "check",
  "iconcheck",
  "button",
  "iconbutton",
  "colorPicker",
  "twocol",
  "treeview",
  "slider",
  "simpleslider",
  "curve1d",
  "noteframe",
  "vecpopup",
  "prop",
  "tool",
  "toolPanel",
  "textbox",
  "dynamicMenu",
  "add",
  "prepend",
  "useIcons",
  "noMarginsOrPadding",
  "wrap",
];

/** Modifies prototype of cls to forward methods in `keys` to `this[propertyKey][key]`*/
export function forwardContainerMethods(
  cls: any,
  propertyKey: string,
  keys: string[] = defaultForwardKeys
) {
  /* 
    Unfortunately TS does not make this easy for us.  It almost works to use
    a mixin pattern, but unfortunately you can't pass generic parameters to mixin 
    functions which we need to do for the CTX parameter.

    Thus we do this in a completely type erased manner with `any`.
  */

  for (let k of keys) {
    cls.prototype[k] = function (this: any, ...args: any[]) {
      return (this[propertyKey] as any)[k].apply(this, args);
    };
  }
}
