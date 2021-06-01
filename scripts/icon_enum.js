"use strict";

/*
Icons are defined in spritesheets that live in
the iconsheet16/32 dom nodes.  Icons are numbered start from
the upper left sprite tile.

This function sets the mapping between icon numbers and names.

The following icons should be in the icon sheet and in this map:

RESIZE      :
SMALL_PLUS  :
TRANSLATE   : for moving things
UI_EXPAND   : panel open icon
UI_COLLAPSE : panel close icon
NOTE_EXCL   : exclamation mark for notifications
HELP        : help symbol
*/
export function setIconMap(icons) {
  for (let k in icons) {
    Icons[k] = icons[k];
  }
}

let a = 0;
export let Icons = {
  FOLDER: a++,
  FILE  : a++,
  TINY_X: a++,

  SMALL_PLUS : a++,
  SMALL_MINUS: a++,
  UNDO       : a++,

  REDO: a++,
  HELP: a++,

  UNCHECKED   : a++,
  CHECKED     : a++,
  LARGE_CHECK : a++,
  CURSOR_ARROW: a++,
  NOTE_EXCL   : a++,
  SCROLL_DOWN : a++,
  SCROLL_UP   : a++,
  BACKSPACE   : a++,
  LEFT_ARROW  : a++,
  RIGHT_ARROW : a++,
  UI_EXPAND   : a++, //triangle
  UI_COLLAPSE : a++, //triangle


  BOLD         : a++,
  ITALIC       : a++,
  UNDERLINE    : a++,
  STRIKETHRU   : a++,
  TREE_EXPAND  : a++,
  TREE_COLLAPSE: a++,
  ZOOM_OUT     : a++,
  ZOOM_IN      : a++
};

