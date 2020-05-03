import {Canvas, CanvasPoint, CanvasEdge, CanvasPath} from "./draw.js";
import {PathTypes} from "./draw.js";
import * as nstructjs from '../util/struct.js';
import {Vector4} from "../../scripts/vectormath.js";

export class BrushSettings {
  constructor() {
    this.size = 25;
    this.soft = 0.0;
    this.type = "circle";
    this.spacing = 0.145;
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

export let Brushes = [];
Brushes.get = function(name) {
  for (let i=0; i<this.length; i++) {
    if (name === this[i].define().name) {
      return this[i];
    }
  }
};

export class Brush {
  constructor() {
    this.size = 35;
    this.soft = 0.5;
  }

  doSoft(path, fac=1.0) {
    path.material.blur = ~~(this.soft*this.size*fac);
  }

  genPaths(canvas) {

  }

  static define() {return {
    name : "base"
  }}

  static register(cls) {
    Brushes.push(cls);
  }
};

export class CircleBrush extends Brush {
  constructor() {
    super();
  }

  genPaths(canvas) {
    let r = this.size*0.5;

    let v1 = canvas.makeVertex([0, 0]);
    let v2 = canvas.makeVertex([0, r]);
    let path = canvas.makePath([v1, v2]);
    path.type = PathTypes.CIRCLE;

    this.doSoft(path);

    return [path];
  }

  static define() {return {
    name : "circle"
  }}
}

Brush.register(CircleBrush);
