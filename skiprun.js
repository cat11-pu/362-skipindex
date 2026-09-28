// skiprun.js：按处理预算处理并留账
//   step(spec)：预算内逐条校验并处理，预算用尽后剩余事件连着载压账。
//   close(spec)：不限预算把账上的事件做完，返回补齐条数。
import { levelOf, walkOf } from "./skip.js";

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function codes(spec) {
  const source = spec || {};
  return {
    event: source.event_error_code || "E_BAD_EVENT",
    key: source.bad_key_code || "E_BAD_KEY",
    dup: source.dup_code || "E_DUP_KEY"
  };
}

function cloneState(state) {
  const source = state || {};
  return {
    nodes: (source.nodes || []).map(function (row) { return [row[0], row[1]]; }),
    records: (source.records || []).map(function (row) { return [row[0], row[1], row[2]]; }),
    ledger: (source.ledger || []).map(function (row) { return [row[0], row[1]]; }),
    applied: (source.applied || []).map(function (row) { return [row[0], row[1]]; })
  };
}

function checkEvent(event, code) {
  if (!event || typeof event !== "object") fail(code.event, "event must be an object");
  if (event.kind !== "insert" && event.kind !== "find") fail(code.event, "unknown event kind");
  if (!Number.isInteger(event.key) || event.key <= 0) fail(code.key, "key must be a positive integer");
}

function alreadyApplied(state, kind, key) {
  return state.applied.some(function (row) { return row[0] === kind && row[1] === key; });
}

function applyInsert(state, kind, key, code) {
  if (state.nodes.some(function (row) { return row[0] === key; })) {
    fail(code.dup, "duplicate key " + key);
  }
  const level = levelOf(state.nodes.length + 1);
  const entry = [key, level];
  let at = state.nodes.length;
  while (at > 0 && state.nodes[at - 1][0] > key) at -= 1;
  state.nodes.splice(at, 0, entry);
}

function applyFind(state, kind, key) {
  const got = walkOf(state.nodes, key);
  state.records.push([key, got.steps, got.hit ? 1 : 0]);
}

function applyEvent(state, kind, key, code) {
  if (kind === "insert") applyInsert(state, kind, key, code);
  else applyFind(state, kind, key);
  state.applied.push([kind, key]);
}

export function step(spec) {
  const source = spec || {};
  const code = codes(source);
  const state = cloneState(source.state);
  const events = Array.isArray(source.events) ? source.events : [];
  const rawBudget = Number(source.budget);
  let budget = Number.isFinite(rawBudget) ? Math.floor(rawBudget) : 0;
  if (budget < 0) budget = 0;
  let served = 0;
  let judged = 0;

  // 先消化账上压着的旧事件，再处理本轮新事件。
  const rest = [];
  for (const row of state.ledger) {
    if (budget <= 0) { rest.push(row); continue; }
    judged += 1;
    if (alreadyApplied(state, row[0], row[1])) continue;
    checkEvent({ kind: row[0], key: row[1] }, code);
    applyEvent(state, row[0], row[1], code);
    budget -= 1;
    served += 1;
  }
  state.ledger = rest;

  for (let i = 0; i < events.length; i += 1) {
    judged += 1;
    if (budget <= 0) {
      for (let j = i; j < events.length; j += 1) {
        const pending = events[j];
        state.ledger.push([pending && pending.kind, pending && pending.key]);
      }
      break;
    }
    const event = events[i];
    checkEvent(event, code);
    if (alreadyApplied(state, event.kind, event.key)) continue;
    applyEvent(state, event.kind, event.key, code);
    budget -= 1;
    served += 1;
  }

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger,
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const source = spec || {};
  const code = codes(source);
  const state = cloneState(source.state);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const row of pending) {
    if (alreadyApplied(state, row[0], row[1])) continue;
    checkEvent({ kind: row[0], key: row[1] }, code);
    applyEvent(state, row[0], row[1], code);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
