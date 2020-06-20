# NStructJS

NStructJS is a little library for saving/loading highly structured JS objects as binary data
(for more info, see the [official documentation](https://github.com/joeedh/STRUCT/wiki) ).
It is not suited for unstructed data (use JSON for that).  
NStructJS arose out of the following shortcomings of JSON:

- JSON allocates objects twice.
- JSON is slow compared to what you can get with a structured binary format

The idea of NStructJS is to attach little scripts to your classes that define that 
class's data and how it is saved.  For example:

```
class SomeClass {
  constructor() {
    this.data1 = 0;
    this.data2 = [1, 2, 3];
    this.obj = [some object];
  }
  
  //reader "fills in" fields in a newly created object with loaded data
  loadSTRUCT(reader) {
    reader(this);
    super.loadSTRUCT(reader);
  }
}
SomeClass.STRUCT = `
my_module.SomeClass {
  data1 : int;
  data2 : array;
  obj   : int | this.obj.id;
}
`;
nstructjs.manager.add_class(SomeClass);
```

## Control How Fields Are Saved

You can use little code snippets to control how fields are saved.
For example, if you want to save an integer ID instead of a reference for an 
object property, you might do this:

```
my_module.AnotherClass {
  someclass : int | this.someclass !== undefined ? this.someclass.id : -1;
}
```

## Versioning

To a certain extend nstructjs will gracefully handle version changes.  The basic idea is to save a
copy of your struct scripts with each file, that way each file knows how to load itself.


