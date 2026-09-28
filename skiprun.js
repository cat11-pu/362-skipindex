// skiprun.js：按处理预算处理并留账
import { levelOf, walkOf } from "./skip.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail("E_BAD_EVENT", "事件必须是对象");
  }
  if (event.kind !== "insert" && event.kind !== "find") {
    fail("E_BAD_EVENT", "事件 kind 必须是 insert 或 find");
  }
  const key = event.key;
  if (typeof key !== "number" || !Number.isInteger(key) || key <= 0) {
    fail("E_BAD_KEY", "键必须是正整数");
  }
}

function initState(state) {
  state = state || {};
  return {
    nodes: state.nodes ? state.nodes.map(function (row) { return [row[0], row[1]]; }) : [],
    records: state.records ? state.records.map(function (row) { return [row[0], row[1], row[2]]; }) : [],
    ledger: state.ledger ? state.ledger.map(function (row) { return [row[0], row[1]]; }) : [],
    applied: Array.isArray(state.applied) ? state.applied.slice() : [],
    _ledgerMeta: Array.isArray(state._ledgerMeta) ? state._ledgerMeta.slice() : []
  };
}

function budgetOf(spec, fallback) {
  const budget = spec.budget;
  if (typeof budget !== "number" || !Number.isInteger(budget) || budget < 0) {
    return fallback;
  }
  return budget;
}

function isApplied(applied, tag) {
  return applied.some(function (done) {
    return Array.isArray(done) && done[0] === tag[0] && done[1] === tag[1];
  });
}

function insertNode(nodes, key) {
  const level = levelOf(nodes.length + 1);
  let pos = nodes.length;
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i][0] > key) { pos = i; break; }
  }
  nodes.splice(pos, 0, [key, level]);
}

export function step(spec) {
  const events = spec.events || [];
  events.forEach(validateEvent);

  const state = initState(spec.state);
  let budget = budgetOf(spec, 0);

  const queue = state.ledger.map(function (row, i) {
    return { kind: row[0], key: row[1],
             tag: state._ledgerMeta[i] || ["l", "ledger:" + i] };
  }).concat(events.map(function (event) {
    return { kind: event.kind, key: event.key, tag: ["e", event.id] };
  }));

  state.ledger = [];
  state._ledgerMeta = [];

  let served = 0;
  let judged = 0;

  for (const item of queue) {
    if (isApplied(state.applied, item.tag)) continue;
    if (budget <= 0) {
      state.ledger.push([item.kind, item.key]);
      state._ledgerMeta.push(item.tag);
      continue;
    }
    budget -= 1;
    judged += 1;

    if (item.kind === "insert") {
      if (state.nodes.some(function (row) { return row[0] === item.key; })) {
        fail("E_DUP_KEY", "键已在表中：" + item.key);
      }
      insertNode(state.nodes, item.key);
    } else {
      const result = walkOf(state.nodes, item.key);
      state.records.push([item.key, result.steps, result.hit ? 1 : 0]);
    }
    state.applied.push(item.tag);
    served += 1;
  }

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return [row[0], row[1]]; }),
    judged: judged,
    judged_bound: queue.length
  };
}

export function close(spec) {
  const state = initState(spec.state);
  let catchup = 0;

  for (let i = 0; i < state.ledger.length; i += 1) {
    const row = state.ledger[i];
    const tag = state._ledgerMeta[i] || ["l", "ledger:" + i];
    if (!isApplied(state.applied, tag)) {
      if (row[0] === "insert") {
        if (!state.nodes.some(function (node) { return node[0] === row[1]; })) {
          insertNode(state.nodes, row[1]);
        }
      } else {
        const result = walkOf(state.nodes, row[1]);
        state.records.push([row[1], result.steps, result.hit ? 1 : 0]);
      }
      state.applied.push(tag);
      catchup += 1;
    }
  }
  state.ledger = [];
  state._ledgerMeta = [];

  return { state: state, catchup: catchup };
}
