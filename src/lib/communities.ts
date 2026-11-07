import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import { buildAdjacency, topKEdges, type RankableEdge } from "./edgeRank.js";

/** Small seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Renumber community ids so 0 is the largest, 1 the next, and so on.
 * Ties go to the community whose first member has the lowest index. -1 stays -1.
 */
export function renumberBySize(raw: readonly number[]): number[] {
  const size = new Map<number, number>();
  const first = new Map<number, number>();
  raw.forEach((c, i) => {
    if (c < 0) return;
    size.set(c, (size.get(c) ?? 0) + 1);
    if (!first.has(c)) first.set(c, i);
  });
  const order = [...size.keys()].sort((a, b) => size.get(b)! - size.get(a)! || first.get(a)! - first.get(b)!);
  const to = new Map(order.map((c, i) => [c, i]));
  return raw.map((c) => (c < 0 ? -1 : to.get(c)!));
}

export interface LeafCommunityOptions {
  k: number;
  resolution: number;
  seed: number;
}

/**
 * Louvain over the default view: each node's top k co edges by npmi, unioned
 * across endpoints, weighted by npmi. Nodes with no such edge get -1.
 * Returns one id per node, renumbered by size.
 */
export function leafCommunities(
  edges: readonly RankableEdge[],
  nodeCount: number,
  { k, resolution, seed }: LeafCommunityOptions,
): number[] {
  const visible = [...topKEdges(buildAdjacency(edges, nodeCount, "npmi"), edges, "npmi", k)]
    .map((i) => edges[i]!)
    .sort((a, b) => a.s - b.s || a.t - b.t);

  const g = new Graph({ type: "undirected" });
  const inGraph = new Set<number>();
  for (const e of visible) inGraph.add(e.s).add(e.t);
  for (const i of [...inGraph].sort((a, b) => a - b)) g.addNode(String(i));
  for (const e of visible) g.addEdge(String(e.s), String(e.t), { weight: e.npmi });

  const raw = new Array<number>(nodeCount).fill(-1);
  if (g.order > 0) {
    const mapping = louvain(g, { resolution, rng: mulberry32(seed), getEdgeWeight: "weight" });
    for (const [node, c] of Object.entries(mapping)) raw[Number(node)] = c;
  }
  return renumberBySize(raw);
}

/**
 * Give each parent the most common community among its leaf descendants
 * (ties to the lower id), or -1 if none has one. Leaves keep their own.
 */
export function withParentCommunities(
  leafCommunity: readonly number[],
  children: readonly (readonly number[])[],
  isLeaf: readonly boolean[],
): number[] {
  return leafCommunity.map((own, i) => {
    if (isLeaf[i]) return own;
    const counts = new Map<number, number>();
    const seen = new Set<number>([i]);
    const stack = [...(children[i] ?? [])];
    while (stack.length) {
      const v = stack.pop()!;
      if (seen.has(v)) continue;
      seen.add(v);
      if (isLeaf[v]) {
        const c = leafCommunity[v]!;
        if (c >= 0) counts.set(c, (counts.get(c) ?? 0) + 1);
      } else {
        stack.push(...(children[v] ?? []));
      }
    }
    let best = -1;
    let bestCount = 0;
    for (const [c, n] of counts) {
      if (n > bestCount || (n === bestCount && c < best)) {
        best = c;
        bestCount = n;
      }
    }
    return best;
  });
}

export interface CommunityInfo {
  id: number;
  /** Labels of the community's two largest leaf tags, joined by " / ". */
  name: string;
  /** Number of leaf tags in it. */
  size: number;
}

export function describeCommunities(
  community: readonly number[],
  nodes: readonly { label: string; card_count: number; is_leaf: boolean }[],
): CommunityInfo[] {
  const members: number[][] = [];
  community.forEach((c, i) => {
    if (c < 0 || !nodes[i]!.is_leaf) return;
    (members[c] ??= []).push(i);
  });
  return [...members.keys()].map((id) => {
    const list = members[id] ?? [];
    const top = [...list].sort((a, b) => nodes[b]!.card_count - nodes[a]!.card_count || a - b).slice(0, 2);
    return { id, name: top.map((i) => nodes[i]!.label).join(" / "), size: list.length };
  });
}
