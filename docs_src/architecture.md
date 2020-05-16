# Introduction 
Path.ux follows a strict model/view/controller paradigm.  The application 
state is the model, path.ux is the (or a) view, and the controller is 
the means by which path.ux queries the model.  In addition, there are two
layers of controllers: the first, [Context](context), is a simple
(and application-defined) API to access the application state, while the
second is small scripting language akin to Angle's data bindings and builds
on the first.
  
For example, you might see code like this:

```
    function makePanel(layout) {
      layout.useIcons();
      layout.prop("view3d.selectmode");
      layout.tool("view3d.select_all()");
    }
```

"View3d.selectmode" is a data path.  It's akin to an object path or Angle's data bindings.
"View3d.select_all()" is a tool path, which is a bit different.  

Note that path.ux mostly makes use of the data path controller.  It does pass
around a (client-provided) Context instance, which is required to have the 
following properties:

- api       : a [ModelInterface](@ModelInterface) class (typically a [DataAPI](@DataAPI) instance)
- screen    : The current screen, a [Screen](@Screen) instance (or subclass of)
- toolstack : The tool stack, see [ToolStack](@ToolStack)
 
Path.ux allows different controller implementations (though they must all pass type information via the 
classes in toolprop.js).  The included implementation can be found in 
"simple_controller.js", and the abstract interface in "controller.js".

# Context


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



