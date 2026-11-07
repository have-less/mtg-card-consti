import type { DominantColor } from "./types.js";

/**
 * Each node's top-level ancestor and its distance to it, following parent
 * links up. With several roots, the one with the largest card count wins
 * (then the nearest, then the lowest index). A root points to itself.
 * Cycles with no root above them count the node as its own root.
 */
export function rootParents(
  parents: readonly (readonly number[])[],
  cardCount: readonly number[],
): { root: number[]; depth: number[] } {
  const root: number[] = [];
  const depth: number[] = [];
  for (let i = 0; i < parents.length; i++) {
    const dist = new Map<number, number>([[i, 0]]);
    const queue = [i];
    for (let q = 0; q < queue.length; q++) {
      const v = queue[q]!;
      for (const p of parents[v] ?? []) {
        if (dist.has(p)) continue;
        dist.set(p, dist.get(v)! + 1);
        queue.push(p);
      }
    }
    let best = i;
    let bestDist = 0;
    let found = false;
    for (const [v, d] of dist) {
      if ((parents[v]?.length ?? 0) > 0) continue;
      const better =
        !found ||
        cardCount[v]! > cardCount[best]! ||
        (cardCount[v] === cardCount[best] && (d < bestDist || (d === bestDist && v < best)));
      if (better) {
        best = v;
        bestDist = d;
        found = true;
      }
    }
    root.push(best);
    depth.push(bestDist);
  }
  return { root, depth };
}

const COLOR_ORDER: readonly DominantColor[] = ["W", "U", "B", "R", "G", "M", "C"];

/**
 * The most common bucket over a tag's cards, given each card's color identity
 * key ("C", "W", "UB", ...): one color counts as that color, two or more as M,
 * none as C. A tie for most common is M, since cycles often hold one card of
 * each color. An empty set is C.
 */
export function dominantColor(colorKeys: Iterable<string>): DominantColor {
  const counts = new Map<DominantColor, number>();
  for (const key of colorKeys) {
    const bucket: DominantColor = key === "C" ? "C" : key.length === 1 ? (key as DominantColor) : "M";
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let best: DominantColor = "C";
  let bestCount = 0;
  let tied = false;
  for (const c of COLOR_ORDER) {
    const n = counts.get(c) ?? 0;
    if (n > bestCount) {
      best = c;
      bestCount = n;
      tied = false;
    } else if (n > 0 && n === bestCount) {
      tied = true;
    }
  }
  return tied ? "M" : best;
}
