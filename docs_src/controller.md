The controller is the glue by which the UI queries the model (application state), and is loosely based on 
Blender's RNA system.  UI code doesn't hold references to model objects; instead it holds special
special "data paths".  Objects in the model are wrapped in a special 
API that describes all the type information a UI needs (e.g. property types, icon, tooltips, 
numeric ranges, etc).  Simple paths are used to lookup data in the model 
(e.g. ```obj.property.something[bleh]```).

Blender's RNA was originally created to provide one wrapper API that could power Blender's UI, 
scripting, and animation systems.  

# Type-In-Place API
Originally path.ux was designed to strictly separate the code that wraps model object from
the code that builds UIs.  A new API that does both is in the works.

# Object Wrapping Example

```
    //our test class we want to wrap
    class Thing {
      constructor(name, id, location, opacity) {
        this.name = name; //str
        this.id = id; //int
        this.location = location; //enumeration
        this.opacity = opacity; //float
      }
    }
    
    //enumeration for .location member
    const LocationEnum = {
      LIVING_ROOM : 0,
      BEDROOM : 1,
      DRIVEWAY : 2
    };
    
    import {DataAPI} from 'controller.js';
    
    export api = new DataAPI();
    
    //create a structure mapping to Thing
    let st = api.mapStruct(Thing);
    
    //define properties and their types
    //these all have the prototype (membername, apiname, ui_name, description)
    
    st.string("name", "name", "Name", "Name of thing");
    st.int("id", "id", "ID", "Unique ID of thing");
    st.enum("location", "location", "Location", "Location of thing").icons({
      LIVING_ROOM : [some icon id],
      BEDROOM : [some icon id],
      DRIVEWAY : [some icon id],
    });
    st.float("opacity", "opacity", "Opacity", "Transparency of thing").range(0, 1);

```
