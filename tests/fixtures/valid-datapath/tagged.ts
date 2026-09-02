// Containers that declare their data-path prefix. The rule joins prefix + path
// and requires an exact catalog match, so the typo lines are the ones expected
// to report. Line numbers are asserted by validDatapathRule.test.ts.
import type { Container } from "../../../scripts/core/ui";

declare const container: Container;

export function buildObject() {
  const con = container.withDataPrefix<"scene.objects[n].">();

  con.prop("size"); // ok
  con.prop("material.roughness"); // ok, nested tail
  con.prop("sizee"); // BAD: scene.objects[n].sizee
  con.prop("strength"); // BAD: a real path, but not under this prefix
  con.prop("/workspace.brush.strength"); // ok, leading "/" escapes the prefix
}

export function buildWithoutTrailingDot() {
  // A prefix that does not carry its "." still joins correctly.
  const con = container.withDataPrefix<"scene.objects[n]">();

  con.slider("size"); // ok
  con.slider("nope"); // BAD: scene.objects[n].nope
}
