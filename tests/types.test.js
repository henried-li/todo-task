import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTE, findType, newTypeId } from "../src/types.js";

test("PALETTE has 12 distinct hex colors", () => {
  assert.equal(PALETTE.length, 12);
  for (const c of PALETTE) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
  assert.equal(new Set(PALETTE).size, PALETTE.length);
});

test("findType returns the matching type", () => {
  const types = [
    { id: "a", name: "A", color: "#fff" },
    { id: "b", name: "B", color: "#000" }
  ];
  assert.deepEqual(findType(types, "b"), { id: "b", name: "B", color: "#000" });
});

test("findType falls back to first type on miss", () => {
  const types = [
    { id: "a", name: "A", color: "#fff" },
    { id: "b", name: "B", color: "#000" }
  ];
  assert.deepEqual(findType(types, "does-not-exist"), types[0]);
});

test("newTypeId slugifies the name and appends a random suffix", () => {
  const id = newTypeId("Work Items!");
  assert.match(id, /^work-items-[a-z0-9]{4}$/);
});

test("newTypeId handles empty and weird input", () => {
  assert.match(newTypeId(""), /^type-[a-z0-9]{4}$/);
  assert.match(newTypeId("!!!"), /^type-[a-z0-9]{4}$/);
  assert.match(newTypeId(undefined), /^type-[a-z0-9]{4}$/);
});

test("newTypeId generates unique ids", () => {
  const ids = new Set();
  for (let i = 0; i < 50; i++) ids.add(newTypeId("Same Name"));
  // suffix is 4 chars from base36 (~1.6M combos) — collisions in 50 draws are extremely rare
  assert.ok(ids.size >= 49);
});
