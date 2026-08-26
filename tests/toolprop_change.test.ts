import { test, expect } from "vitest";
import {
  ArrayBufferProperty,
  BoolProperty,
  EnumProperty,
  FlagProperty,
  FloatArrayProperty,
  FloatProperty,
  IntProperty,
  ListProperty,
  Mat4Property,
  QuatProperty,
  StringProperty,
  StringSetProperty,
  ToolProperty,
  Vec2Property,
  Vec3Property,
  Vec4Property,
  type CallbackFn,
} from "../scripts/path-controller/toolsys/toolprop";
import { Curve1DProperty } from "../scripts/path-controller/curve/curve1d_toolprop";
import { Matrix4, Quat } from "../scripts/path-controller/util/vectormath";
import type { BSplineCurve } from "../scripts/path-controller/curve/curve1d_bspline";

type Case = {
  name: string;
  sub: (cb: CallbackFn) => void;
  set: () => void;
  /** getValue() reduced to a value toEqual can compare. */
  snap: () => unknown;
  value: () => unknown;
  expected: unknown;
};

function propCase<P extends ToolProperty>(
  name: string,
  prop: P,
  set: (p: P) => void,
  snap: (p: P) => unknown,
  expected: unknown
): Case {
  return {
    name,
    sub: (cb) => {
      prop.on("change", cb);
    },
    set  : () => set(prop),
    snap : () => snap(prop),
    value: () => prop.getValue(),
    expected,
  };
}

function bufferOf(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

const curveSource = new Curve1DProperty();
(curveSource.getValue().generators.active as BSplineCurve).add(0.5, 0.25);

const matrix = new Matrix4();
matrix.translate(1, 2, 3);

const cases: Case[] = [
  propCase(
    "StringProperty",
    new StringProperty("old"),
    (p) => p.setValue("new"),
    (p) => p.getValue(),
    "new"
  ),
  propCase(
    "IntProperty",
    new IntProperty(1),
    (p) => p.setValue(3.7),
    (p) => p.getValue(),
    3
  ),
  propCase(
    "FloatProperty",
    new FloatProperty(1),
    (p) => p.setValue(2.5),
    (p) => p.getValue(),
    2.5
  ),
  propCase(
    "BoolProperty",
    new BoolProperty(false),
    (p) => p.setValue(true),
    (p) => p.getValue(),
    true
  ),
  propCase(
    "EnumProperty",
    new EnumProperty(0, { a: 0, b: 1 }),
    (p) => p.setValue(1),
    (p) => p.getValue(),
    1
  ),
  propCase(
    "FlagProperty",
    new FlagProperty(0, { A: 1, B: 2 }),
    (p) => p.setValue(3),
    (p) => p.getValue(),
    3
  ),
  propCase(
    "Vec2Property",
    new Vec2Property([0, 0]),
    (p) => p.setValue([1, 2]),
    (p) => Array.from(p.getValue()),
    [1, 2]
  ),
  propCase(
    "Vec3Property",
    new Vec3Property([0, 0, 0]),
    (p) => p.setValue([1, 2, 3]),
    (p) => Array.from(p.getValue()),
    [1, 2, 3]
  ),
  // A short vector is padded, and the padding lands before the fire.
  propCase(
    "Vec4Property",
    new Vec4Property([0, 0, 0, 0]),
    (p) => p.setValue([1, 2]),
    (p) => Array.from(p.getValue()),
    [1, 2, 0, 1]
  ),
  propCase(
    "QuatProperty",
    new QuatProperty(),
    (p) => p.setValue(new Quat([1, 2, 3, 4])),
    (p) => Array.from(p.getValue()),
    [1, 2, 3, 4]
  ),
  propCase(
    "Mat4Property",
    new Mat4Property(),
    (p) => p.setValue(matrix),
    (p) => ({ ...p.getValue().$matrix }),
    { ...matrix.$matrix }
  ),
  propCase(
    "FloatArrayProperty",
    new FloatArrayProperty([0]),
    (p) => p.setValue([1, 2, 3]),
    (p) => Array.from(p.getValue()),
    [1, 2, 3]
  ),
  propCase(
    "ArrayBufferProperty",
    new ArrayBufferProperty(bufferOf([0])),
    (p) => p.setValue(bufferOf([1, 2, 3])),
    (p) => Array.from(new Uint8Array(p.getValue())),
    [1, 2, 3]
  ),
  propCase(
    "ListProperty",
    new ListProperty(new IntProperty(0), [1, 2]),
    (p) => p.setValue([3, 4]),
    (p) => p.getValue().map((item) => item.getValue()),
    [3, 4]
  ),
  propCase(
    "StringSetProperty",
    new StringSetProperty("a", ["a", "b"]),
    (p) => p.setValue("b"),
    (p) => [...p.getValue()],
    ["b"]
  ),
  propCase(
    "Curve1DProperty",
    new Curve1DProperty(),
    (p) => p.setValue(curveSource.getValue()),
    (p) => p.equals(curveSource),
    true
  ),
];

for (const c of cases) {
  test(`${c.name} stores the value before firing change`, () => {
    const seen: unknown[] = [];
    const args: unknown[] = [];

    c.sub(function (arg) {
      seen.push(c.snap());
      args.push(arg);
    });
    c.set();

    expect(seen).toEqual([c.expected]);
    expect(args).toEqual([c.value()]);
    expect(c.snap()).toEqual(c.expected);
  });
}

test("a number property refuses null without firing", () => {
  const int = new IntProperty(7);
  const float = new FloatProperty(7);
  const fired: string[] = [];

  int.on("change", () => fired.push("int"));
  float.on("change", () => fired.push("float"));

  int.setValue(null);
  float.setValue(undefined);

  expect(fired).toEqual([]);
  expect([int.getValue(), float.getValue()]).toEqual([7, 7]);
});

test("an enum refuses a value outside its items without firing", () => {
  const prop = new EnumProperty<number>(0, { a: 0, b: 1 });
  const fired: unknown[] = [];

  prop.on("change", (arg) => fired.push(arg));
  prop.setValue(2);

  expect(fired).toEqual([]);
  expect(prop.getValue()).toBe(0);
});

test("FloatArrayProperty throws on undefined without firing", () => {
  const prop = new FloatArrayProperty([1, 2]);
  const fired: unknown[] = [];

  prop.on("change", (arg) => fired.push(arg));

  expect(() => prop.setValue(undefined)).toThrow();
  expect(fired).toEqual([]);
  expect(Array.from(prop.getValue())).toEqual([1, 2]);
});
