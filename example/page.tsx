/**
 * JSX port of example/page.xml — proof of concept for the typed JSX layer.
 *
 * The declarative tree lives here; interactive wiring that page.xml could not
 * express (graph-pack canvas, dependsOn, the export-theme handler, listbox item
 * names) is handed back through typed `ref` callbacks instead of the
 * `getElementById` lookups the xmlpage version needed in properties.ts.
 *
 * `<prop path="...">` is type-checked against KnownDataPath; run
 * `pnpm run gen:paths` to turn unknown paths into compile errors.
 */

import { jsx } from "./pathux.js";
import type { Container, UIBase, ListBox } from "./pathux.js";

export interface PropsPageRefs {
  exportButton?: (btn: UIBase) => void;
  graphTab?: (tab: Container) => void;
  listbox?: (lb: ListBox) => void;
  eventStrip?: (con: Container) => void;
}

export function PropsPage(refs: PropsPageRefs = {}) {
  return (
    <tabs pos="left" style="overflow-y : scroll">
      <tab label="Theme" data-testid="tab-theme">
        <button ref={refs.exportButton}>Export Theme</button>
        <theme-editor-x></theme-editor-x>
      </tab>
      <tab label="Tab" data-testid="tab-tab">
        <tool path="canvas.draw()" useIcons="false">
          Exec Draw
        </tool>
        <panel label="Panel" closed="false" path="data">
          <strip mode="vertical">
            <prop path="angle1" />
            <prop path="angle2" />
          </strip>
          <prop path="vector_test" />
          <column>
            <pathlabel path="vector_test[0]" />
            <pathlabel path="vector_test[1]" />
          </column>
          <row>
            <pathlabel path="vector_test[2]" />
            <pathlabel path="vector_test[3]" />
          </row>
          <strip ref={refs.eventStrip} />
        </panel>
        <panel label="Canvas" path="canvas">
          <prop path="drawflag[BLUR]" useIcons="false" />
        </panel>
      </tab>
      <tab label="Graph Packing" ref={refs.graphTab} data-testid="tab-graph-packing" />
      <tab label="Curve Mapping" data-testid="tab-curve-mapping">
        <prop path="data.curvemap" />
      </tab>
      <tab label="ListBox" data-testid="tab-listbox">
        <label>Canvas paths (DataList-backed listbox):</label>
        <listbox path="canvas.paths" ref={refs.listbox} height="220" resize-axes="xy" />
        <panel label="Active Path" path="canvas.paths.active">
          <colorfield path="material.color" />
        </panel>
      </tab>
      <tab label="Last Command" data-testid="tab-last-command">
        <last-tool-panel-x />
      </tab>
    </tabs>
  );
}
