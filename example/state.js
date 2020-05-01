import {Vector4} from '../scripts/vectormath.js';
import {DataAPI, DataStruct, DataPath} from '../scripts/simple_controller.js';
import * as nstructjs from '../scripts/struct.js';
import {Icons} from './icon_enum.js';

export class Sheet {
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
}
Sheet.STRUCT = `
Sheet {
  a : float;
  b : float;
  c : float; 
}
`;
nstructjs.register(Sheet);

export class ModelData {
  constructor() {
    this.sheet = [];

    this.sheet.push(new Sheet(1, 2, 3));
    this.sheet.push(new Sheet(2, 3, 3));
    this.sheet.push(new Sheet(1, 4, 3));
    this.sheet.push(new Sheet(1, 5, 3));
    this.sheet.push(new Sheet(2, 6, 3));

    this.sheet.active = this.sheet[0];

    this.value = 0;
    this.enum = 0;
    this.color = new Vector4([0, 0, 0, 1]);
    this.text = `
# Very simple markdown editor example
## Only does headers and unordered lists

* 1
* 2
* 3

    `;
  }
}
ModelData.STRUCT = `
example.ModelData {
  color : vec4;
  enum  : int;
  value : float;
  text  : string;
}
`;
nstructjs.register(ModelData);

export function createAPI() {
  let api = new DataAPI();

  let cstruct = new DataStruct();
  api.setRoot(cstruct);

  let dstruct = cstruct.struct("data", "data", "Data");

  dstruct.color4("color", "color", "Color");
  dstruct.enum("enum", "enum", {
    A : 0,
    B : 2,
    C : 8,
    D : 16
  }, "Enum").icons({
    A : Icons.CHECKED,
    B : Icons.CURSOR_ARROW,
    C : Icons.SCROLL_DOWN,
    D : Icons.SCROLL_UP
  });

  dstruct.string("text", "text", "Text");

  let SheetSt = api.mapStruct(Sheet, true);
  SheetSt.float("a", "a", "a");
  SheetSt.float("b", "b", "b");
  SheetSt.float("c", "c", "c");

  dstruct.list("sheet", "sheet", [
    function getStruct(api, list, key) {
      return SheetSt;
    },
    function getLength(api, list) {
      return list.length;
    },
    function getActive(api, list) {
      return list.active;
    },
    function setActive(api, list, key) {
      list.active = list[key];
    },
    function get(api, list, key) {
      return list[key];
    },
    function set(api, list, key, val) {
      list[key] = val;
    },
    function getIter(api, list) {
      return list;
    },
    function getKey(api, list, item) {
      return list.indexOf(item);
    }
  ]);
  return api;
}
