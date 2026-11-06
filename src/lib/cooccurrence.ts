import { cosine, npmi, round3 } from "./scores.js";
import type { CardTag, CooccurrenceEdge } from "./types.js";

export interface CooccurrenceResult {
  /** Edges with count >= minCount and npmi > 0, strongest count first. */
  edges: CooccurrenceEdge[];
  /** Cards with at least one leaf tag. */
  n: number;
  /** Leaf tag id -> number of cards directly tagged with it. */
  tagCounts: Map<string, number>;
  /** Distinct leaf pairs sharing at least one card, before any filtering. */
  pairsBeforeFilter: number;
  /** Pairs left after the minCount filter, before dropping npmi <= 0. */
  pairsAfterMinCount: number;
}

/**
 * Link every pair of leaf tags that share a card, using each card's direct taggings.
 *   count  = number of shared cards
 *   score  = sum over shared cards of (weight A * weight B)
 *   npmi   = normalized PMI of the pair
 *   cosine = count / sqrt(n_a * n_b)
 * Pairs with count below minCount, or npmi <= 0 after rounding, are dropped.
 */
export function cooccurrence(
  cards: Iterable<{ tags: CardTag[] }>,
  isLeaf: (tagId: string) => boolean,
  minCount = 1,
): CooccurrenceResult {
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
  const tagCounts: number[] = [];
  let n = 0;
  const pairKey = (a: number, b: number) => a * 2 ** 21 + b; // supports ~2M tags

  for (const card of cards) {
    // Dedupe tags per card (keep highest weight) and keep leaves only.
    const byTag = new Map<number, number>();
    for (const t of card.tags) {
      if (!isLeaf(t.id)) continue;
      const i = toIdx(t.id);
      byTag.set(i, Math.max(byTag.get(i) ?? 0, t.weight));
    }
    if (byTag.size === 0) continue;
    n++;
    const list = [...byTag.entries()].sort((x, y) => x[0] - y[0]);
    for (const [a] of list) tagCounts[a] = (tagCounts[a] ?? 0) + 1;
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
  let pairsAfterMinCount = 0;
  for (const [k, count] of counts) {
    if (count < minCount) continue;
    pairsAfterMinCount++;
    const a = Math.floor(k / 2 ** 21);
    const b = k % 2 ** 21;
    const na = tagCounts[a]!;
    const nb = tagCounts[b]!;
    const edgeNpmi = round3(npmi(count, na, nb, n));
    if (edgeNpmi <= 0) continue;
    const sa = ids[a]!;
    const sb = ids[b]!;
    const [source, target] = sa < sb ? [sa, sb] : [sb, sa];
    edges.push({
      source,
      target,
      type: "cooccurrence",
      count,
      score: round3(scores.get(k) ?? 0),
      npmi: edgeNpmi,
      cosine: round3(cosine(count, na, nb)),
    });
  }
  edges.sort((x, y) => y.count - x.count || (x.source + x.target).localeCompare(y.source + y.target));

  return {
    edges,
    n,
    tagCounts: new Map(ids.map((id, i) => [id, tagCounts[i] ?? 0])),
    pairsBeforeFilter: counts.size,
    pairsAfterMinCount,
  };
}
