import { test } from "node:test";
import assert from "node:assert/strict";
import { purgeOldDone } from "../src/storage.js";

function makeTask(overrides) {
  return {
    id: "t",
    title: "x",
    note: "",
    typeId: "work",
    dueDate: null,
    done: false,
    doneAt: null,
    order: 1,
    ...overrides
  };
}

test("purgeOldDone removes tasks completed before the cutoff", () => {
  const cutoff = new Date("2026-05-10T00:00:00").getTime();
  const state = {
    tasks: [
      makeTask({ id: "a", done: true, doneAt: "2026-05-09T22:00:00.000Z" }), // before cutoff
      makeTask({ id: "b", done: true, doneAt: "2026-05-10T08:00:00.000Z" }), // after cutoff
      makeTask({ id: "c", done: false })                                       // not done
    ]
  };
  purgeOldDone(state, cutoff);
  const ids = state.tasks.map(t => t.id);
  assert.deepEqual(ids, ["b", "c"]);
});

test("purgeOldDone keeps done tasks with no doneAt timestamp", () => {
  // Defensive: should not crash and should not remove (since we can't tell when).
  const state = {
    tasks: [makeTask({ id: "x", done: true, doneAt: null })]
  };
  purgeOldDone(state, Date.now());
  assert.equal(state.tasks.length, 1);
});

test("purgeOldDone is a no-op on an empty task list", () => {
  const state = { tasks: [] };
  purgeOldDone(state, Date.now());
  assert.deepEqual(state.tasks, []);
});

test("purgeOldDone keeps active (not done) tasks regardless of date", () => {
  const state = {
    tasks: [
      makeTask({ id: "old", done: false, dueDate: "1999-01-01" })
    ]
  };
  purgeOldDone(state, Date.now());
  assert.equal(state.tasks.length, 1);
});
