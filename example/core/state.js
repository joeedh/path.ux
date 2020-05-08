import {Vector4, DataAPI, DataStruct, DataPath, nstructjs, Curve1D} from '../pathux.js';
import {Icons} from '../editors/icon_enum.js';
import {Canvas} from '../draw/draw.js';

export class Cell {
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
}
Cell.STRUCT = `
Cell {
  a : float;
  b : float;
  c : float; 
}
`;
nstructjs.register(Cell);

export class ModelData {
  constructor() {
    this.sheet = [];

    this.sheet.push(new Cell(1, 2, 3));
    this.sheet.push(new Cell(2, 3, 3));
    this.sheet.push(new Cell(1, 4, 3));
    this.sheet.push(new Cell(1, 5, 3));
    this.sheet.push(new Cell(2, 6, 3));

    this.canvas = new Canvas();
    this.sheet.active = this.sheet[0];

    this.curvemap = new Curve1D();

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
  sheet     : array(Cell);
  canvas    : Canvas;
  curvemap  : Curve1D;
}
`;
nstructjs.register(ModelData);

