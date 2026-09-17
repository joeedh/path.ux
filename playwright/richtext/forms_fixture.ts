import { iconmanager, ToolStack } from "../../scripts/pathux";
import { createFormsDemo } from "../../example/editors/properties/forms_demo";

for (const sheet of (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets)
  sheet.image ||= { src: "" };
const context = {
  api      : {} as never,
  screen   : {} as never,
  state    : {},
  toolstack: new ToolStack(),
  toLocked() {
    return this;
  },
};
const demo = createFormsDemo(document.body, context);
declare global {
  interface Window {
    forms: typeof demo;
  }
}
window.forms = demo;
