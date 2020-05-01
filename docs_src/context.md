# Context design:

Context is a simplified API to access the application model.  Contexts are passed around
to ToolOps and used by path.ux.

# Context Overlay:
A context overlay is a class that overrides context fields.  It has a validate()
method that is polled regularly; if it returns false the overlay is removed.

Contexts can be "frozen" with .lock.  When frozen they should *have no direct object 
references at all*, other then .state, .datalib and .api.  

Properties can control this with "_save" and "_load" methods inside
of the overlay classes, as well as overriding saveProperty and loadProperty
inside of Context subclasses.

Example of a context overlay:

    class ContextOverlay {
      validate() {
        //check if this overlay is still valid or needs to be removed
      }
    
      static contextDefine() {return {
        flag    :   0 //see ContextFlags
    
        //an example of inheritance.  inheritance is automatic for fields
        //that are missing from contextDefine().
        flag    :   Context.inherit([a bitmask to or with parent])
      }}
        
      get selectedObjects() {
        /*
          if you want to get a property from below the stack in the ctx
          use this.ctx or return Context.super
        */
        if (some_reason) {
            //tell ctx to 
            return Context.super();
        } else {
            //this will also work
            return this.ctx.selectedObjects;
        }
        
        return this.ctx.scene.objects.selected.editable;
      }
    
      selectedObjects_save() {
        let ret = [];
        for (let ob of this.selectedObjects) {
            ret.push(ob.id);        
        }
        
        return ret;
      }
    
      selectedObjects_load(ctx, data) {
        let ret = [];
        
        for (let id of data) {
            ret.push([lookup object from data using (possible new) context ctx])
        }
        
        return ret;
      }
    }

# Locked contexts

Locked contexts are contexts whose properties are "saved", but not as direct references.
Instead, each property is (ideally) saved as some sort of ID or datapath to look up
the true value on property access.

We suggest you subclass Context and implement saveProperty and loadProperty methods.

    class Overlay extends ContextOverlay {
      get something() {
        return something;
      }
    
      something_save() {
        return this.state.something.id;
      }
    
      something_load(ctx, id) {
        return [lookup id somewhere to get something];
      }
    }

## Tool Contexts

We encourage you to put Context properties related to the view inside
a separate ContextOverlay.  That way you can keep ToolOps from accessing
the view by feeding them a special context that lacks that overlay
(but note that tools in modal mode should always get a full context). 

```
class ToolOverlay extends ContextOverlay {
    static contextDefine() {return {
        name : "tool"
    }}
    
    get mesh() {
        return this.state.mesh;
    }
    
    get material() {
        return this.state.material;
    }
}
Context.register(ToolOverlay);

class ViewOverlay extends ContextOverlay {
    static contextDefine() {return {
        name : "view",
        flag : ContextFlags.IS_VIEW
    }}
    
    get screen() {
        return this.state.screen;
    }
    
    get textEditor() {
        return 
    }
}
Context.register(ToolOverlay);
```


