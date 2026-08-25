// used to avoid instanceof Screen tests that would cause circular dependencies
export const IsScreenTag = Symbol("IsScreenTag");

/**
 * Stacking order for everything path.ux floats over the screen mesh. Popups sit above
 * floating panels, which sit above menus. `measuring` parks a popup behind the screen
 * while its first layout is read, and `measuringHidden` does the same for a menu measured
 * before it opens. `popupTitlebar` lifts a popup area's titlebar over the editor beneath
 * it, which has its own stacking context.
 */
export const ZIndexes = {
  popup          : 2205,
  floatingPanel  : 205,
  menu           : 50,
  measuring      : -10,
  measuringHidden: -10000,
  popupTitlebar  : 3,
} as const;
