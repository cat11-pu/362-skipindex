import assert from "node:assert";
import { levelOf, walkOf } from "../skip.js";
import { step, close } from "../skiprun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { nodes: [], records: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "insert", key: 1 }],
  bad_key_code: "E_BAD_KEY", dup_code: "E_DUP_KEY",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("levelOf returns a number", () => {
  assert.strictEqual(typeof levelOf(2), "number");
});

check("walkOf returns steps and hit", () => {
  const got = walkOf([[1, 1], [2, 2]], 2);
  assert.strictEqual(typeof got.steps, "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
