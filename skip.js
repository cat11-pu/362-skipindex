// skip.js：层数与走位（基线：一律原样返回）
export function levelOf(seq) {
  return 1;
}

export function walkOf(nodes, target) {
  return { steps: 0, hit: false };
}
