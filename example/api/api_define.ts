import { DataAPI, DataStruct, buildToolSysAPI } from "../pathux.js";
import { Icons } from "../editors/icon_enum.js";
import { WorkspaceEditor } from "../editors/workspace/workspace.js";
import {
  Canvas,
  DrawFlags,
  CanvasPath,
  Material,
  CanvasPoint,
  CanvasEdge,
  ElementArray,
} from "../draw/draw.js";
import { Brushes, BrushSettings, Brush } from "../draw/brush.js";
import { Dynamics, DynamicsState, DynamicModes, DynamicKey } from "../core/dynamics.js";

function api_define_material(api: DataAPI) {
  const st = api.mapStruct(Material, true);

  const onchange = () => {
    window.redraw_all_full();
  };

  st.color4("color", "color", "Color").on("change", onchange);
  st.float("blur", "blur", "blur").range(0, 512).on("change", onchange);
}

function api_define_canvaspath(api: DataAPI) {
  const st = api.mapStruct(CanvasPath, true);

  st.struct("material", "material", "Material", api.mapStruct(Material));
}

function api_define_canvas(api: DataAPI) {
  const st = api.mapStruct(Canvas);
  const pathst = api.mapStruct(CanvasPath);

  const onchange = () => {
    window.redraw_all_full();
  };

  st.flags("drawflag", "drawflag", DrawFlags).on("change", onchange);
  st.list("paths", "paths", [
    function getStruct(api: DataAPI, list: ElementArray<CanvasPath>, key: number) {
      return pathst;
    },
    function getLength(api: DataAPI, list: ElementArray<CanvasPath>) {
      return list.length;
    },
    function getActive(api: DataAPI, list: ElementArray<CanvasPath>) {
      return list.active;
    },
    function setActive(api: DataAPI, list: ElementArray<CanvasPath>, key: number) {
      list.active = list[key];
    },
    function get(api: DataAPI, list: ElementArray<CanvasPath>, key: number) {
      return list[key];
    },
    function set(api: DataAPI, list: ElementArray<CanvasPath>, key: number, val: CanvasPath) {
      list[key] = val;
    },
    function getIter(api: DataAPI, list: ElementArray<CanvasPath>) {
      return list;
    },
    function getKey(api: DataAPI, list: ElementArray<CanvasPath>, item: CanvasPath) {
      return list.indexOf(item);
    },
  ]);
}

function api_define_dynamics(api: DataAPI) {}

function api_define_brushsettings(api: DataAPI) {
  const st = api.mapStruct(BrushSettings, true);

  st.float("size", "size", "Size")
    .range(0.25, 1024)
    .uiRange(0.25, 512)
    .decimalPlaces(1)
    .expRate(1.25)
    .unit("pixel")
    .step(1.0)
    .slideSpeed(5.0);

  st.float("spacing", "spacing", "spacing")
    .range(0.01, 2)
    .decimalPlaces(2)
    .noUnits()
    .sliderDisplayExp(1.0/3.0)
    .expRate(1.4)
    .step(0.025)
    .simpleSlider();

  st.color4("color", "color", "Color");
  st.float("soft", "soft", "Soft") //
    .range(0, 1.0)
    .decimalPlaces(3)
    .step(0.025)
    .expRate(1.4)
    .simpleSlider()
    .noUnits();
}

function api_define_workspace(api: DataAPI) {
  const st = api.mapStruct(WorkspaceEditor, true);

  st.struct("brush", "brush", "Brush", api.mapStruct(BrushSettings));
}

export function defineAPI() {
  const api = new DataAPI();

  const cstruct = new DataStruct();
  api.setRoot(cstruct);

  api_define_material(api);
  api_define_canvaspath(api);

  api_define_canvas(api);
  api_define_dynamics(api);
  api_define_brushsettings(api);
  api_define_workspace(api);

  cstruct.struct("canvas", "canvas", "Canvas", api.mapStruct(Canvas));
  cstruct.struct("workspace", "workspace", "Workspace", api.mapStruct(WorkspaceEditor));

  const dstruct = cstruct.struct("data", "data", "Data");
  dstruct.curve1d("curvemap", "curvemap", "curvemap");

  dstruct.float("angle1", "angle1", "angle1").baseUnit("radian").displayUnit("degree").range(-Math.PI, Math.PI);
  dstruct.float("angle2", "angle2", "angle2").baseUnit("degree").displayUnit("radian").range(-180, 180);
  dstruct.bool("boolval", "boolval", "Bool");
  dstruct.color4("color", "color", "Color");

  dstruct
    .vec4("vector_test", "vector_test", "vector_test")
    .decimalPlaces(1)
    .baseUnit("radian")
    .displayUnit("degree")
    .range(-180, 180);

  //set up some api fields require by path.ux
  cstruct.dynamicStruct("last_tool", "last_tool", "Last Tool");
  buildToolSysAPI(api, false, cstruct);

  return api;
}
