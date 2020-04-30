The controller is the glue by which the UI queries the model (application state).  By design, UI code isn't allowed to hold direct references to model objects; instead it stores special object paths.

These arn't direct paths to real objects though, they operate via a special wrapper API, and in fact the object model the controller presents need not match the real underlying data structures.

Note that path.ux allows plugging in different controller implementations; shown here is the one shipped with the code.

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
