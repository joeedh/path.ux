import { beforeAll, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { newMenu } from "../scripts/menu/menu";
import type { UIBase } from "../scripts/core/ui_base";
import { setMeta, StdUXMeta, widgetSegment } from "../scripts/core/base/ui_meta_tags";
import { walkWidgets, widgetPathOf } from "../scripts/core/base/ui_meta_walk";

const HERE = dirname(fileURLToPath(import.meta.url));
const TAGS_MODULE = join(HERE, "../scripts/core/base/ui_meta_tags.ts");

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

function widget(): UIBase {
  return newMenu("meta walk test") as unknown as UIBase;
}

function tagged(valuePath: string): HTMLLIElement {
  const row = document.createElement("li");
  setMeta(row, StdUXMeta, new StdUXMeta({ valuePath }));
  return row;
}

describe("walkWidgets", () => {
  test("yields a tagged node in the light tree", () => {
    const root = document.createElement("div");
    const row = tagged("ui.gate");
    root.appendChild(document.createElement("span")).appendChild(row);

    expect([...walkWidgets(root)]).toEqual([row]);
  });

  test("reaches a tagged node inside a shadow root", () => {
    const host = widget();
    const row = tagged("ui.gate");
    host.shadow.appendChild(row);

    expect([...walkWidgets(host)]).toContain(row);
  });

  test("yields nothing for a tag-free tree", () => {
    const root = document.createElement("div");
    root.appendChild(document.createElement("span"));

    expect([...walkWidgets(root)]).toEqual([]);
  });
});

describe("widgetPathOf", () => {
  test("joins the caller's scope onto the segment", () => {
    const row = tagged("ui.gate");
    const tag = new StdUXMeta({ valuePath: "ui.gate" });

    expect(widgetPathOf(row, "shots")).toBe(`shots/${widgetSegment(tag)}`);
  });

  test("gives two identical siblings the same path, which is the collision to report", () => {
    const root = document.createElement("div");
    const first = tagged("ui.gate");
    const second = tagged("ui.gate");
    root.append(first, second);

    const paths = [...walkWidgets(root)].map((owner) => widgetPathOf(owner, "shots"));

    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe(paths[1]);
  });

  test("answers undefined for an owner carrying no StdUXMeta", () => {
    expect(widgetPathOf(document.createElement("li"), "shots")).toBeUndefined();
  });
});

describe("the tag module stays headless", () => {
  test("imports nothing at runtime but nstructjs", () => {
    const source = readFileSync(TAGS_MODULE, "utf8");
    const runtime = [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+"([^"]+)";/gm)];

    expect(runtime.map((m) => m[1])).toEqual(["../../path-controller/util/nstructjs"]);
  });
});
