import type { CardTag, CooccurrenceEdge } from "./types.js";

/**
 * Link every pair of leaf tags that share a card.
 *   count = number of shared cards
 *   score = sum over shared cards of (weight A * weight B)
 * Edges with count below minCount are dropped.
 */
export function cooccurrenceEdges(
  cards: Iterable<{ tags: CardTag[] }>,
  isLeaf: (tagId: string) => boolean,
  minCount = 1,
): CooccurrenceEdge[] {
  // Map tag ids to small ints so pair keys are cheap numbers.
  const ids: string[] = [];
  const idx = new Map<string, number>();
  const toIdx = (id: string) => {
    let i = idx.get(id);
    if (i === undefined) {
      i = ids.length;
      ids.push(id);
      idx.set(id, i);
    }
    return i;
  };

  const counts = new Map<number, number>();
  const scores = new Map<number, number>();
  const pairKey = (a: number, b: number) => a * 2 ** 21 + b; // supports ~2M tags

  for (const card of cards) {
    // Dedupe tags per card (keep highest weight) and keep leaves only.
    const byTag = new Map<number, number>();
    for (const t of card.tags) {
      if (!isLeaf(t.id)) continue;
      const i = toIdx(t.id);
      byTag.set(i, Math.max(byTag.get(i) ?? 0, t.weight));
    }
    const list = [...byTag.entries()].sort((x, y) => x[0] - y[0]);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [a, wa] = list[i]!;
        const [b, wb] = list[j]!;
        const k = pairKey(a, b);
        counts.set(k, (counts.get(k) ?? 0) + 1);
        scores.set(k, (scores.get(k) ?? 0) + wa * wb);
      }
    }
  }

  const edges: CooccurrenceEdge[] = [];
  for (const [k, count] of counts) {
    if (count < minCount) continue;
    const a = Math.floor(k / 2 ** 21);
    const b = k % 2 ** 21;
    const sa = ids[a]!;
    const sb = ids[b]!;
    const [source, target] = sa < sb ? [sa, sb] : [sb, sa];
    edges.push({
      source,
      target,
      type: "cooccurrence",
      count,
      score: Math.round((scores.get(k) ?? 0) * 1000) / 1000,
    });
  }
  edges.sort((x, y) => y.count - x.count || (x.source + x.target).localeCompare(y.source + y.target));
  return edges;
}
