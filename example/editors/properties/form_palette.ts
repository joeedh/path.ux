import type { FieldControl, FieldHost } from "../../../scripts/widgets/richtext/form_schema";

/**
 * A row of color inputs over a `string[]` field, one per swatch. Shows the field control
 * seam: the control speaks the field's encoded JSON and calls `oninput` on every change.
 */
export function paletteControl(host: FieldHost): FieldControl {
  const element = document.createElement("div");
  element.className = "palette-control";
  element.title = host.meta.help ?? host.node.description ?? "";
  const swatches = document.createElement("span");
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "+";
  add.title = "Add a swatch";
  element.append(swatches, add);
  let colors: string[] | undefined = [];
  let shown: string | undefined;
  let readOnly = false;

  const control: FieldControl = {
    element,
    read       : () => shown,
    write: (_key, text) => {
      if (text === shown) return;
      shown = text;
      colors = text === undefined || text === "" ? undefined : (JSON.parse(text) as string[]);
      render();
    },
    setReadOnly: (on) => {
      readOnly = on;
      render();
    },
    focus      : () => (swatches.querySelector("input") ?? add).focus(),
    dispose    : () => element.remove(),
  };
  const changed = () => {
    shown = colors === undefined ? undefined : JSON.stringify(colors);
    control.oninput?.(host.name, shown);
  };
  const render = () => {
    swatches.replaceChildren();
    for (const [index, color] of (colors ?? []).entries()) {
      const input = document.createElement("input");
      input.type = "color";
      input.value = color;
      input.disabled = readOnly;
      input.setAttribute("aria-label", `Swatch ${index + 1}`);
      input.title = "Pick this swatch's color";
      input.addEventListener("input", () => {
        colors![index] = input.value;
        changed();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Remove this swatch";
      remove.disabled = readOnly;
      remove.addEventListener("click", () => {
        colors!.splice(index, 1);
        changed();
        render();
      });
      swatches.append(input, remove);
    }
    add.disabled = readOnly;
  };
  add.addEventListener("click", () => {
    (colors ??= []).push("#000000");
    changed();
    render();
  });
  render();
  return control;
}
