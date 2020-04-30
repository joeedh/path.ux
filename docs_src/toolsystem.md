# Tool System

Tools are what the user uses to change state in the model.  They handle undo, can take control of events if needed and in generate are foundational to path.ux and it's associated projects.  

Tools all inherit from ToolOp, which roughly looks like this (see Context section for an explanation for what the "ctx" parameters are):

```
class SomeTool extends ToolOp {
  static tooldef() {return {
    uiname   : "Tool",
    path     : "module.tool"
    inputs   : ToolOp.inherit({}), //inherit properties from base class
    outputs  : {}
  }}
  static invoke(ctx, args) {
    /*create a new tool instance.
      args is simple key:val mapping
      where val is either a string, a number
      or a boolean.*/
    return new ToolOp()
  }
  undoPre(ctx) {
    //create undo data
  }
  undo(ctx) {
    //execute undo with data made in previous call to this.undoPre
  }
  exec(ctx) {
    //execute tool
  }
  modalStart(ctx) {
    //start interactice mode
  }
  modalEnd(ctx) {
    //end interactive mode
  }
  on_[mousedown/mousemove/mouseup/keydown](ctx) {
    //interactive mode event
  }
  
  ToolOp.register(SomeTool);
}
```

## Context
The foundation of the tool system is a special Context struct that's provided by client code.  Think of it as defining "arguments" for tools.  Path.ux can use any context struct, but requires the following properties be defined:

```
class Context {
  get api() {
    //return reference to a controller.ModelInterface
  }
  
  get appstate() {
    //return reference to main appstate global
  }
  
  get screen() {
    //return reference to main FrameManager.screen
  }
}
```

In addition, path.ux has hooks to provide UI context, specifically which are is currently active.  To do this,
either override the following methods in ScreenArea.Area.prototype, or subclass Area:

```
  //called when area should be considered "active"
  push_ctx_active() {
  }
  
  //called when area should be considered "inactive"
  pop_ctx_active() {
  }
```

## Undo
Typically tools will inherit from a base class with a general, brute-force undo (i.e. saving the 
entire application and then reloading it on undo).  Additionally to save on speed and memory subclasses 
can override undoPre and undo with their own implementation.


## tooldef()
Tools have a special tooldef() static function that "defines" the tool.  It returns things like
what properties the tool has, it's name, it's path in the data path system, etc.

## Tool Properties
Tools have input and output slots.  See toolprop.js.  There are integer properties, float properties, 
various linear algebra properties (vectors, matrices), enumerations, bitflags, and in addition client code
may provide it's own property classes.


