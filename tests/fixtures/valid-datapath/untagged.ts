// A container with no declared prefix. The rule cannot resolve a relative path,
// so it accepts anything matching a known path suffix and only reports what
// matches nothing at all.
import type { Container } from "../../../scripts/core/ui";

declare const container: Container;

export function build() {
  container.prop("workspace.brush.strength"); // ok, a full path
  container.prop("strength"); // ok, suffix of a known path
  container.prop("material.roughness"); // ok, suffix of a known path
  container.prop("nonsense"); // BAD: matches nothing
}
