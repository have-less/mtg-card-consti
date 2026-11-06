/**
 * Per-tag top-k edge selection. Shared by prep (which edges to ship, the
 * community graph) and the viewer (live filtering), so both rank the same way.
 * Browser-safe: no Node imports.
 */

export const SCORE_KEYS = ["npmi", "cosine", "count", "score"] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export interface RankableEdge {
  s: number;
  t: number;
  type: string;
  count?: number;
  score?: number;
  npmi?: number;
  cosine?: number;
}

/** Best first under `key`; ties broken by npmi, then count, then endpoints. */
export function edgeComparator(edges: readonly RankableEdge[], key: ScoreKey) {
  return (a: number, b: number): number => {
    const x = edges[a]!;
    const y = edges[b]!;
    return (
      y[key]! - x[key]! ||
      y.npmi! - x.npmi! ||
      y.count! - x.count! ||
      x.s - y.s ||
      x.t - y.t
    );
  };
}

/**
 * For each node, the indexes (into `edges`) of its co-occurrence edges,
 * sorted best first under `key`. Non-"co" edges are ignored.
 */
export function buildAdjacency(edges: readonly RankableEdge[], nodeCount: number, key: ScoreKey): number[][] {
  const adj: number[][] = Array.from({ length: nodeCount }, () => []);
  edges.forEach((e, i) => {
    if (e.type !== "co") return;
    adj[e.s]!.push(i);
    adj[e.t]!.push(i);
  });
  const cmp = edgeComparator(edges, key);
  for (const list of adj) list.sort(cmp);
  return adj;
}

/**
 * Each node's first k edges scoring at least `floor`, unioned across both
 * endpoints. Returns edge indexes.
 */
export function topKEdges(
  adjacency: readonly (readonly number[])[],
  edges: readonly RankableEdge[],
  key: ScoreKey,
  k: number,
  floor = -Infinity,
  into: Set<number> = new Set(),
): Set<number> {
  for (const list of adjacency) {
    let taken = 0;
    for (const i of list) {
      if (taken >= k) break;
      if (edges[i]![key]! < floor) continue;
      into.add(i);
      taken++;
    }
  }
  return into;
}

/** Edges in the top k of either endpoint under any score. Sorted edge indexes. */
export function shippedEdges(edges: readonly RankableEdge[], nodeCount: number, k: number): number[] {
  const keep = new Set<number>();
  for (const key of SCORE_KEYS) topKEdges(buildAdjacency(edges, nodeCount, key), edges, key, k, -Infinity, keep);
  return [...keep].sort((a, b) => a - b);
}
