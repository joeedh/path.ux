import {Canvas, CanvasPath} from "./draw.js";
import {PathTypes} from "./draw.js";
import {nstructjs, Vector4} from '../pathux.js';

export class BrushSettings {
  static STRUCT: string;

  size: number;
  soft: number;
  type: string;
  spacing: number;
  color: Vector4;

  constructor() {
    this.size = 35;
    this.soft = 0.3;
    this.type = "circle";
    this.spacing = 0.5;
    this.color = new Vector4([0,0,0,1]);
  }
}
BrushSettings.STRUCT = `
BrushSettings {
  size    :   float;
  soft    :   float;
  type    :   string;
  spacing :   float;
  color   :   vec4;
}
`;
nstructjs.register(BrushSettings);

interface BrushClass {
  new (): Brush;
  define(): {name: string};
}

interface BrushList extends Array<BrushClass> {
  get(name: string): BrushClass | undefined;
}

export const Brushes = [] as unknown as BrushList;
Brushes.get = function(name: string) {
  for (let i=0; i<this.length; i++) {
    if (name === this[i].define().name) {
      return this[i];
    }
  }
};

export class Brush {
  size: number;
  soft: number;

  constructor() {
    this.size = 35;
    this.soft = 0.5;
  }

  doSoft(path: CanvasPath, fac=1.0) {
    path.material.blur = ~~(this.soft*this.size*fac);
  }

  genPaths(canvas: Canvas): CanvasPath[] {
    return [];
  }

  static define() {return {
    name : "base"
  }}

  static register(cls: BrushClass) {
    Brushes.push(cls);
  }
};

export class CircleBrush extends Brush {
  constructor() {
    super();
  }

  genPaths(canvas: Canvas): CanvasPath[] {
    const r = this.size*0.5;

    const v1 = canvas.makeVertex([0, 0]);
    const v2 = canvas.makeVertex([0, r]);
    const path = canvas.makePath([v1, v2]);
    path.type = PathTypes.CIRCLE;

    this.doSoft(path);

    return [path];
  }

  static define() {return {
    name : "circle"
  }}
}

Brush.register(CircleBrush);
