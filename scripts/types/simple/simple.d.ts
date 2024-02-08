import { DataStruct } from "../../path-controller/types/controller/controller_base";
import { Area } from "../screen/ScreenArea";

export declare class DataModel {
  static defineAPI(api, dataStruct): DataStruct;
  static register(Class: any);
}

export class Editor extends Area {
  static findEditor(Class: any): boolean;
}
