import { beforeAll, describe, expect, test } from "vitest";
import * as nstructjs from "../scripts/path-controller/util/nstructjs";
import { newMenu } from "../scripts/menu/menu";
import type { UIBase } from "../scripts/core/ui_base";
import { resolveRefusal } from "../scripts/core/base/ui_base_props";
import { Refusal } from "../scripts/path-controller/toolsys/toolop";
import { setMeta, StdUXMeta, type MetaOwner } from "../scripts/core/base/ui_meta_tags";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

function widget(): UIBase {
  return newMenu("meta refusal test") as unknown as UIBase;
}

function roundTrip(tag: StdUXMeta): StdUXMeta {
  const json = nstructjs.writeJSON(tag);
  expect(nstructjs.validateJSON(json, StdUXMeta as never)).toBe(true);
  return nstructjs.readJSON<StdUXMeta>(json, StdUXMeta as never);
}

describe("toolsys.Refusal", () => {
  test("is a registered struct", () => {
    expect(nstructjs.isRegistered(Refusal as never)).toBe(true);
  });
});

describe("StdUXMeta.enabled", () => {
  test("reads the owner's disabled state inverted", () => {
    const elem = widget();
    const tag = new StdUXMeta();

    setMeta(elem, StdUXMeta, tag);
    expect(tag.enabled).toBe(true);

    tag.enabled = false;
    expect(elem.disabled).toBe(true);
    expect(tag.enabled).toBe(false);
  });

  test("buffers for an owner that carries no disabled, and starts enabled", () => {
    const owner: MetaOwner = {};
    const tag = new StdUXMeta();

    setMeta(owner, StdUXMeta, tag);
    expect(tag.enabled).toBe(true);

    tag.enabled = false;
    expect(tag.enabled).toBe(false);
    expect("disabled" in owner).toBe(false);
  });
});

describe("StdUXMeta.refusal", () => {
  test("reports the sentence on a control that is not refusing", () => {
    const elem = widget();
    const tag = new StdUXMeta();

    setMeta(elem, StdUXMeta, tag);
    tag.refusal = { reason: "nothing is selected" };

    // the ungated value is the point: a rule that computes a refusal for a control the editor
    // draws enabled is the silently inert case the record exists to catch
    expect(resolveRefusal(elem)).toBeUndefined();
    expect(tag.refusal).toEqual({ reason: "nothing is selected" });
  });

  test("calls a thunk on read rather than on assignment", () => {
    const elem = widget();
    const tag = new StdUXMeta();
    let calls = 0;

    setMeta(elem, StdUXMeta, tag);
    elem.refusalReason = () => {
      calls++;
      return { reason: "nothing is selected" };
    };

    expect(calls).toBe(0);
    expect(tag.refusal).toEqual({ reason: "nothing is selected" });
    expect(calls).toBe(1);
  });

  test("buffers for an owner that carries no refusalReason", () => {
    const owner: MetaOwner = {};
    const tag = new StdUXMeta();

    setMeta(owner, StdUXMeta, tag);
    tag.refusal = { reason: "nothing is selected" };

    expect(tag.refusal).toEqual({ reason: "nothing is selected" });
    expect("refusalReason" in owner).toBe(false);
  });
});

describe("a tag on the wire", () => {
  test("carries an object-literal refusal with both halves intact", () => {
    const tag = new StdUXMeta();
    tag.refusal = {
      reason     : "nothing is selected",
      description: "Pick a node in the graph first.",
    };
    tag.enabled = false;

    const back = roundTrip(tag);

    expect(back.enabled).toBe(false);
    expect(back.refusal?.reason).toBe("nothing is selected");
    expect(back.refusal?.description).toBe("Pick a node in the graph first.");
  });

  test("writes an absent refusal as null and reads it back as undefined", () => {
    const tag = new StdUXMeta({ description: "Approve the gate" });
    const json = nstructjs.writeJSON(tag) as { refusal?: unknown };

    expect(json.refusal).toBeNull();

    const back = roundTrip(tag);
    expect(back.refusal).toBeUndefined();
    expect(back.enabled).toBe(true);
  });
});
