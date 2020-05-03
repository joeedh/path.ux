import {DataAPI, DataStruct} from "../../scripts/simple_controller.js";
import {Icons} from "../editors/icon_enum.js";
import {WorkspaceEditor} from "../editors/workspace/workspace.js";
import {Canvas, CanvasPath, Material, CanvasPoint, CanvasEdge} from "../draw/draw.js";
import {Brushes, BrushSettings, Brush} from "../draw/brush.js";
import {Dynamics, DynamicsState, DynamicModes, DynamicKey} from "../core/dynamics.js";

function api_define_material(api) {
  let st = api.mapStruct(Material, true);

  let onchange = () => {
    window.redraw_all_full();
  };

  st.color4("color", "color", "Color").on('change', onchange);
  st.float("blur", "blur", "blur").range(0, 512).on('change', onchange);
}

function api_define_canvaspath(api) {
  let st = api.mapStruct(CanvasPath, true);

  st.struct("material", "material", "Material", api.mapStruct(Material));

}
function api_define_canvas(api) {
  let st = api.mapStruct(Canvas);
  let pathst = api.mapStruct(CanvasPath);

  st.list("paths", "paths", [
    function getStruct(api, list, key) {
      return pathst;
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
}

function api_define_dynamics(api) {

}

function api_define_brushsettings(api) {
  let st = api.mapStruct(BrushSettings, true);

  st.float("size", "size", "Size").range(0.25, 1024).uiRange(0.25, 512).decimalPlaces(1).expRate(1.5)
  .step(0.5);
  st.float("spacing", "spacing", "spacing").range(0.01, 4).decimalPlaces(2)
           .expRate(1.4).step(0.025).simpleSlider();
  st.color4("color", "color", "Color");
  st.float("soft", "soft", "Soft").range(0, 1.0).decimalPlaces(3).step(0.025)
           .expRate(1.4).simpleSlider();
}

function api_define_workspace(api) {
  let st = api.mapStruct(WorkspaceEditor, true);

  st.struct("brush", "brush", "Brush", api.mapStruct(BrushSettings));
  
}

export function defineAPI() {
  let api = new DataAPI();

  let cstruct = new DataStruct();
  api.setRoot(cstruct);

  api_define_material(api);
  api_define_canvaspath(api);

  api_define_canvas(api);
  api_define_dynamics(api);
  api_define_brushsettings(api);
  api_define_workspace(api);

  cstruct.struct("canvas", "canvas", "Canvas", api.mapStruct(Canvas));
  cstruct.struct("workspace", "workspace", "Workspace", api.mapStruct(WorkspaceEditor));

  let dstruct = cstruct.struct("data", "data", "Data")  ;
  dstruct.curve1d("curvemap", "curvemap", "curvemap");

  return api;
}
