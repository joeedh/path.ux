import {Vector4, DataAPI, DataStruct, DataPath, nstructjs, Curve1D} from '../pathux.js';
import {Icons} from '../editors/icon_enum.js';
import {Canvas} from '../draw/draw.js';
import {DataBlock} from './datablock.js';

export class ModelData extends DataBlock {
  constructor() {
    super();

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

  static blockDefine() {
    return {
      uiName     : "Model Data",
      typeName   : "model_data",
      defaultName: "Model Data"
    }
  }

  static defineAPI(api) {
    let st = super.defineAPI(api);

    return st;
  }

  copyTo(b) {
    b.angle1 = this.angle1;
    b.angle2 = this.angle2;
    b.canvas = this.canvas;
    this.canvas.copyTo(b.canvas);
    b.vector_test.load(this.vector_test);
    b.color.load(this.color);
    b.text = this.text;
    b.value = this.value;
    b.enum = this.enum;
    this.curvemap.copyTo(b.curvemap);
  }

  copy() {
    let ret = new ModelData();
    this.copyTo(ret);
    return ret;
  }
}

ModelData.STRUCT = nstructjs.inherit(ModelData, DataBlock, 'example.ModelData') + `
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
DataBlock.register(ModelData);
