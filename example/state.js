import {Vector4} from '../scripts/vectormath.js';
import {DataAPI, DataStruct, DataPath} from '../scripts/simple_controller.js';
import * as nstructjs from '../scripts/struct.js';

export class ModelData {
  constructor() {
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
  }, "Enum");
  dstruct.string("text", "text", "Text");

  return api;
}
