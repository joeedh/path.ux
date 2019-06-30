# Introduction

Path.ux is roughly based on [Blender's](http://www.blender.org) architecture.

# Data Bindings

[Main page](manual/controller.html)

The Blender 2.5 project refactored the internal architecture into a rough MVC pattern.  The model is the core code, the view is the UI, and the controller is the glue between them.

The controller is called "RNA" and it uses the concept of object paths. So if you have an object, you could look up type information (and the value of) a property with a simple path, e.g. "object.subobject.some_property".  Blender uses RNA for its user interface, its python api and its animation system (you can associate object paths with animation curves).

Internally the controller has a special wrapper API for blender's c-struct-based pseudo-objects.  This works extremely well as it keeps type information that's only used by the UI out of the model codebase (e.g. the model might not care that a specific color should be clamped to 0-2 instead of 0-1).  Even better, the object model presented by the controller need not match the internal data structures.

Since the controller provides type info to the UI a lot of messy boilerplate is avoided, leading to very consise layout code:

    def panel(layout, context):
        row = layout.row
        row.prop(context.object, "some_object_property")
        row.tool("mesh.subdivide")



