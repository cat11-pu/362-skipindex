// skip.js：层数与走位
export function levelOf(seq) {
  let level = 1;
  let n = seq;
  while (Number.isInteger(n) && n >= 2 && n % 2 === 0) {
    n = n / 2;
    level += 1;
  }
  return level;
}

export function walkOf(nodes, target) {
  let top = 0;
  for (const row of nodes) {
    if (row[1] > top) top = row[1];
  }
  let steps = 0;
  let idx = -1;
  for (let level = top; level >= 1; level -= 1) {
    for (;;) {
      let next = -1;
      for (let j = idx + 1; j < nodes.length; j += 1) {
        if (nodes[j][1] >= level) { next = j; break; }
      }
      if (next === -1 || nodes[next][0] > target) break;
      idx = next;
      steps += 1;
    }
  }
  return { steps: steps, hit: idx >= 0 && nodes[idx][0] === target };
}
