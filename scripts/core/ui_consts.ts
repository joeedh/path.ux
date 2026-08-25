export const ClassIdSymbol = Symbol("pathux-class-id");

/**
 * Marks RowFrame and its subclasses so Container can test for them without importing
 * ui_containers, which would evaluate `class RowFrame extends Container` before Container
 * exists.
 */
export const IsRowFrameTag = Symbol("IsRowFrame");
