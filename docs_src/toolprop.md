# Tool Properties

Tool Properties are generic typed value containers.  They
store things like:

* Numbers (floats, integers)
* Vectors
* Simple lists
* Enumerations
* Bitflags

Tool properties also store various UX related data:

* Ranges
* Tooltips
* UI names
* Slider step sizes
* Number units

Tool properties are used by the ToolOp API
(the basic operators that implement the undo stack)
as well as the datapath controller API (where they internally
provide type information for the application model)

## API

The basic interface for tool properties is:
<pre>

class ToolProperty {
    getValue() {
    }

    setValue(v) {
    }
    
    //add event callback, type should be 'change'
    on(type, cb) {
    }
}

</pre>

