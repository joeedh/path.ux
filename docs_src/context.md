# Context design:

Context is a simplified API to access the application model.  Contexts are passed around
to ToolOps and used by path.ux.

# Context Overlay:
A context overlay is a class that overrides context fields.  It has a validate()
method that is polled regularly; if it returns false the overlay is removed.

Contexts can be "frozen" with .lock.  When frozen they should *have no direct object 
references at all*, other then .state, .datalib and .api.  
Properties can control this with "_save" and "_load" methods inside
of the overlay classes.

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
    
      selectedObjects_load(data) {
        let ret = [];
        
        for (let id of data) {
            ret.push([lookup object from data])
        }
        
        return ret;
      }
    }

# Locked contexts

Locked contexts are contexts whose properties are "saved", but not as direct references.
Instead, each property is (ideally) saved as some sort of ID or datapath to look up
the true value on property access.

We suggest you subclass Context and implement a defaultPropertyWrapper function which
will generate id/datapath wrappers.  The laternative is to use _save and _load methods:

    class Overlay extends ContextOverlay {
      get something() {
        return something;
      }
    
      something_save() {
        return this.state.something.id;
      }
    
      something_load(id) {
        return [lookup id somewhere to get something];
      }
    }




