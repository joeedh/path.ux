# Introduction

Path.ux follows a strict model/view/controller paradigm.  The application state
is the model, path.ux is the (or a) view, and the controller is the means by which
path.ux queries the model.

The controller is based on the concept of object paths.  
For example, you might see code like this:

```
function makePanel(layout) {
  layout.prop("view3d.selectmode", PackFlags.USE_ICONS);
  layout.tool("view3d.select_all()", PackFlags.USE_ICONS);
}
```

The controller is responsible for telling path.ux what type "view3d.selectmode" is, 
what its icon is, the current value, etc.  Similarly the controller tells path.ux
what the tool view3d.select_all() is: it's icon, if it can run in the current context (more on context later),
it's hotkey, etc.

Path.ux allows different controller implementations (though they must all pass type information via the 
classes in toolprop.js).  The included implementation can be found in "simple_controller.js", and the abstract interface
in "controller.js".

# Context
Contexts are bundles of data that tell the UI (and tools, and whatever else needs them) the current application state.

Path.ux requires the following context abstract class:

```
class Context {
  get screen() {
    //get current Screen instance, or instance of a subclass of it
  }
  
  get area() {
    //get active area editor
    return Area.getActiveArea()
  }
  
  get state() {
    //get application state
  }
  
  get api() {
    //returns a subclass of controller.js:ModalInterface
    //this is the controller
  }
  
  get toolstack() {
    //returns an instance (or subclass instance) of simple_toolsys.js:ToolStack
  }
}
```

To use a ctx class, simply assign an instance of one 
to .ctx on a Screen instance.  For example:

```
let screen = document.createElement("screen-x");
screen.ctx = new Context();
```

## Tool Contexts

It's encouraged to have a restricted Context struct for the model to use, and have 
path.ux's context subclass off of that.  This is so the model doesnt have access to 
the screen and area properties.  For example:

```
class ToolContext {
  get state() {
    //get application state
  }
  
  get api() {
    //returns a subclass of controller.js:ModalInterface
    //this is the controller
  }
  
  get toolstack() {
    //returns an instance (or subclass instance) of simple_toolsys.js:ToolStack
  }
  
  get selected_3d_object() {
    //this is how you would pass things like the current selected object in
    //CAD apps to tool operators.
  }
}

class Context extends ToolContext {
  get screen() {
    //get current Screen instance, or instance of a subclass of it
  }
  
  get area() {
    //get active area editor
    return Area.getActiveArea()
  }
}
```

# History

Path.ux is roughly based on [Blender's](http://www.blender.org) architecture.

[Main page](manual/controller.html)

The Blender 2.5 project refactored the internal architecture into a rough MVC pattern.  The model is the core code, the view is the UI, and the controller is the glue between them.

The controller is called "RNA" and it uses the concept of object paths. So if you have an object, you could look up type information (and the value of) a property with a simple path, e.g. "object.subobject.some_property".  Blender uses RNA for its user interface, its python api and its animation system (you can associate object paths with animation curves).

Internally the controller has a special wrapper API for blender's c-struct-based pseudo-objects.  This works extremely well as it keeps type information that's only used by the UI out of the model codebase (e.g. the model might not care that a specific color should be clamped to 0-2 instead of 0-1).  Even better, the object model presented by the controller need not match the internal data structures.

Since the controller provides type info to the UI a lot of messy boilerplate is avoided, leading to very consise layout code:

    def panel(layout, context):
        row = layout.row
        row.prop(context.object, "some_object_property")
        row.tool("mesh.subdivide")



