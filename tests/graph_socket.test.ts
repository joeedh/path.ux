import { test, expect } from "vitest";
import { readJSON, writeJSON } from "../scripts/path-controller/util/nstructjs";
import { Vector3 } from "../scripts/path-controller/util/vectormath";
import { NodeSocketBase, registerSocketType, getSocketClass } from "../scripts/graph/socket";
import type { SocketTypeDef } from "../scripts/graph/socket";
import { FloatSocket, Vec3Socket } from "../scripts/graph/sockets_std";
import type { ISocketOwner } from "../scripts/graph/graph_types";

function link(a: NodeSocketBase, b: NodeSocketBase) {
  a.edges.push(b);
  b.edges.push(a);
}

function ownerOf(flagged: string[], name: string): ISocketOwner {
  return {
    id   : name,
    graph: undefined,
    flagDirty() {
      flagged.push(name);
    },
  };
}

test("unconnected input with a defaultProp returns the default", () => {
  const sock = new FloatSocket("in");

  expect(sock.getValue()).toBe(0);

  sock.defaultProp!.setValue(3);
  expect(sock.getValue()).toBe(3);
});

test("unconnected input without a defaultProp returns undefined", () => {
  const sock = new FloatSocket("in");
  sock.defaultProp = undefined;

  expect(sock.getValue()).toBeUndefined();
});

test("connected input pulls through the edge", () => {
  const src = new FloatSocket("out");
  const dst = new FloatSocket("in");
  link(src, dst);

  src.setValue(5);
  expect(dst.getValue()).toBe(5);

  src.setValue(7);
  expect(dst.getValue()).toBe(7);
});

test("float coerces into a vec3 input by splatting", () => {
  const src = new FloatSocket("out");
  const dst = new Vec3Socket("in");
  link(src, dst);

  src.setValue(2);

  const v = dst.getValue()!;
  expect([v[0], v[1], v[2]]).toEqual([2, 2, 2]);
});

test("vec3 coerces into a float input by component average", () => {
  const src = new Vec3Socket("out");
  const dst = new FloatSocket("in");
  link(src, dst);

  src.setValue(new Vector3([3, 6, 9]));
  expect(dst.getValue()).toBe(6);
});

test("coerce writes the converted value and dryRun does not", () => {
  const src = new Vec3Socket("out");
  src.setValue(new Vector3([3, 6, 9]));

  const dry = new FloatSocket("out");
  expect(dry.coerce(src, { dryRun: true })).toBe(true);
  expect(dry.getValue()).toBeUndefined();

  const wet = new FloatSocket("out");
  expect(wet.coerce(src)).toBe(true);
  expect(wet.getValue()).toBe(6);
});

test("coerce between unrelated types answers false", () => {
  const src = new NodeSocketBase("out");
  const dst = new FloatSocket("in");

  expect(dst.coerce(src, { dryRun: true })).toBe(false);
  expect(dst.coerce(src)).toBe(false);
});

test("a multi-connected input reduces the incoming values", () => {
  const a = new FloatSocket("out");
  const b = new FloatSocket("out");
  const dst = new FloatSocket("in");
  dst.multiSocket = true;
  dst.reduce = (values) => values.reduce((sum, v) => sum + v, 0);

  link(a, dst);
  link(b, dst);
  a.setValue(1);
  b.setValue(2);

  expect(dst.getValue()).toBe(3);

  a.setValue(10);
  expect(dst.getValue()).toBe(12);
});

test("resolveSource names the source without valuing it", () => {
  const src = new FloatSocket("out");
  const dst = new FloatSocket("in");
  link(src, dst);

  expect(src.resolveSource()).toBe(src);
  expect(dst.resolveSource()).toBe(src);

  const lone = new FloatSocket("in");
  expect(lone.resolveSource()).toBe(lone.defaultProp);
});

test("output setValue dirties the connected inputs and flags their owners", () => {
  const flagged: string[] = [];
  const src = new FloatSocket("out");
  const dstA = new FloatSocket("in");
  const dstB = new FloatSocket("in");

  src.owningNode = ownerOf(flagged, "producer");
  dstA.owningNode = ownerOf(flagged, "consumerA");
  dstB.owningNode = ownerOf(flagged, "consumerB");
  link(src, dstA);
  link(src, dstB);

  src.setValue(5);

  expect(dstA.isDirty).toBe(true);
  expect(dstB.isDirty).toBe(true);
  expect(flagged.sort()).toEqual(["consumerA", "consumerB"]);
});

test("dirty propagation over a cyclic edge set terminates", () => {
  const a = new FloatSocket("out");
  const b = new FloatSocket("out");
  link(a, b);

  a.setValue(1);

  expect(a.isDirty).toBe(true);
  expect(b.isDirty).toBe(true);
});

test("a socket JSON round-trips with its defaultProp intact", () => {
  const sock = new FloatSocket("in");
  sock.socketId = 7;
  sock.defaultProp!.setValue(42);

  const loaded = readJSON(writeJSON(sock), FloatSocket);

  expect(loaded.socketId).toBe(7);
  expect(loaded.dir).toBe("in");
  expect(loaded.defaultProp!.getValue()).toBe(42);
  expect(loaded.defaultProp!.wasSet).toBe(true);
});

test("a string socketId survives the round-trip as a string", () => {
  const sock = new FloatSocket("in");
  sock.socketId = "lhs";

  const loaded = readJSON(writeJSON(sock), FloatSocket);
  expect(loaded.socketId).toBe("lhs");
});

test("an output socket round-trips without acquiring a defaultProp", () => {
  const sock = new FloatSocket("out");
  sock.socketId = 3;

  const loaded = readJSON(writeJSON(sock), FloatSocket);

  expect(loaded.dir).toBe("out");
  expect(loaded.defaultProp).toBeUndefined();
  expect(loaded.multiSocket).toBe(true);
});

test("registerSocketType refuses a mismatched typeName", () => {
  class BadSocket extends NodeSocketBase<"bad", number> {
    static override socketDef(): SocketTypeDef {
      return { typeName: "WrongName", type: "bad" };
    }
  }

  expect(() => registerSocketType(BadSocket)).toThrow(/does not match/);
});

test("registerSocketType refuses a class without its own socketDef", () => {
  class NoDefSocket extends NodeSocketBase {}

  expect(() => registerSocketType(NoDefSocket)).toThrow(/socketDef/);
});

test("getSocketClass resolves a registered typeName", () => {
  expect(getSocketClass("FloatSocket")).toBe(FloatSocket);
  expect(getSocketClass("Vec3Socket")).toBe(Vec3Socket);
  expect(getSocketClass("NotRegistered")).toBeUndefined();
});

test("registerSocketType auto-registers a STRUCT so a custom subclass round-trips", () => {
  class CustomSocket extends FloatSocket {
    static override socketDef(): SocketTypeDef {
      return { typeName: "CustomSocket", type: "float", color: "#123456" };
    }
  }

  registerSocketType(CustomSocket);

  const sock = new CustomSocket("in");
  sock.socketId = 11;
  sock.defaultProp!.setValue(5);

  const loaded = readJSON(writeJSON(sock), CustomSocket);

  expect(loaded).toBeInstanceOf(CustomSocket);
  expect(loaded.socketId).toBe(11);
  expect(loaded.defaultProp!.getValue()).toBe(5);
  expect(getSocketClass("CustomSocket")).toBe(CustomSocket);
});

test("dev asserts fire for defaultProp on an output and setValue on an input", () => {
  const out = new FloatSocket("out");
  out.defaultProp = new FloatSocket("in").defaultProp;
  expect(() => out.getValue()).toThrow(/input sockets only/);

  const inp = new FloatSocket("in");
  expect(() => inp.setValue(1)).toThrow(/output sockets only/);
});
