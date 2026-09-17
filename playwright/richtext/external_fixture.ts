import { iconmanager, ToolStack } from "../../scripts/pathux";
import { createExternalDemo } from "../../example/editors/properties/external_demo";
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
const external = createExternalDemo(document.body, context);
declare global {
  interface Window {
    externalDemo: typeof external;
  }
}
window.externalDemo = external;
