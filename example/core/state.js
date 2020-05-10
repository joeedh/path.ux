import {Vector4, DataAPI, DataStruct, DataPath, nstructjs, Curve1D} from '../pathux.js';
import {Icons} from '../editors/icon_enum.js';
import {Canvas} from '../draw/draw.js';

export class ModelData {
  constructor() {

    this.angle1 = Math.PI*0.5;
    this.angle2 = 90.0;

    this.canvas = new Canvas();

    this.curvemap = new Curve1D();

    this.vector_test = new Vector4();
    this.value = 0;
    this.enum = 0;
    this.color = new Vector4([0, 0, 0, 1]);
    this.text = '';
  }
}
ModelData.STRUCT = `
example.ModelData {
  color     : vec4;
  enum      : int;
  value     : float;
  text      : string;
  canvas    : Canvas;
  curvemap  : Curve1D;
  angle1    : float;
  angle2    : float;
}
`;
nstructjs.register(ModelData);

