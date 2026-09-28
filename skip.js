// skip.js：层数与走位
//   levelOf(seq)：插入序号从 1 起在第 1 层，序号能连除几次 2 就再加几层。
//   walkOf(nodes, target)：从最高层头位置起每层尽量右走，下一步键更大就停，
//                          下降不计步；回到底层后比对停住的键。
export function levelOf(seq) {
  let level = 1;
  let n = Math.floor(Number(seq));
  while (n >= 2 && n % 2 === 0) {
    level += 1;
    n = Math.floor(n / 2);
  }
  return level;
}

export function walkOf(nodes, target) {
  const list = Array.isArray(nodes) ? nodes : [];
  let top = 0;
  for (const row of list) {
    const layer = row ? Number(row[1]) : NaN;
    if (Number.isFinite(layer) && layer > top) top = layer;
  }
  let level = top;
  let pos = -1;
  let steps = 0;
  while (level >= 1) {
    let next = pos + 1;
    while (next < list.length && !(Number(list[next][1]) >= level)) next += 1;
    if (next < list.length && Number(list[next][0]) <= target) {
      pos = next;
      steps += 1;
    } else {
      level -= 1;
    }
  }
  const hit = pos >= 0 && Number(list[pos][0]) === target;
  return { steps: steps, hit: hit };
}
