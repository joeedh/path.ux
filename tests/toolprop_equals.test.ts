import { test, expect } from "vitest";
import {
  ToolProperty,
  FloatArrayProperty,
  ArrayBufferProperty,
  PropClasses,
  customPropertyTypes,
} from "../scripts/path-controller/toolsys/toolprop";
import { Curve1DProperty } from "../scripts/path-controller/curve/curve1d_toolprop";
import type { BSplineCurve } from "../scripts/path-controller/curve/curve1d_bspline";

function bufferOf(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

test("FloatArrayProperty.equals compares length and elements", () => {
  const a = new FloatArrayProperty([1, 2, 3]);

  expect(a.equals(new FloatArrayProperty([1, 2, 3]))).toBe(true);
  expect(a.equals(new FloatArrayProperty([1, 2, 4]))).toBe(false);
  expect(a.equals(new FloatArrayProperty([1, 2]))).toBe(false);
  expect(new FloatArrayProperty().equals(new FloatArrayProperty())).toBe(true);
});

test("ArrayBufferProperty.equals compares bytewise", () => {
  const a = new ArrayBufferProperty(bufferOf([1, 2, 3]));

  expect(a.equals(new ArrayBufferProperty(bufferOf([1, 2, 3])))).toBe(true);
  expect(a.equals(new ArrayBufferProperty(bufferOf([1, 2, 4])))).toBe(false);
  expect(a.equals(new ArrayBufferProperty(bufferOf([1, 2])))).toBe(false);
  expect(new ArrayBufferProperty().equals(new ArrayBufferProperty())).toBe(true);
});

test("Curve1DProperty.equals compares authored curve state", () => {
  const a = new Curve1DProperty();
  const b = new Curve1DProperty();

  expect(a.equals(b)).toBe(true);

  (b.getValue().generators.active as BSplineCurve).add(0.5, 0.25);
  expect(a.equals(b)).toBe(false);

  a.setValue(b.getValue());
  expect(a.equals(b)).toBe(true);
});

test("equals never mutates wasSet", () => {
  const props = [
    new FloatArrayProperty([1, 2]),
    new ArrayBufferProperty(bufferOf([1, 2])),
    new Curve1DProperty(),
  ];

  for (const prop of props) {
    const other = prop.copy() as typeof prop;
    const before = [prop.wasSet, other.wasSet];

    (prop as ToolProperty).equals(other as ToolProperty);

    expect([prop.wasSet, other.wasSet]).toEqual(before);
  }
});

test("every registered property class overrides equals or inherits an override", () => {
  const classes = new Set([...Object.values(PropClasses), ...customPropertyTypes] as {
    name: string;
    prototype: { equals: unknown };
  }[]);

  expect(classes.size).toBeGreaterThan(0);

  for (const cls of classes) {
    expect(cls.prototype.equals, `${cls.name} resolves ToolProperty's throwing equals`).not.toBe(
      ToolProperty.prototype.equals
    );
  }
});
