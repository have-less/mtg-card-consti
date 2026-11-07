import { CO_LINK_COLOR, HIER_LINK_COLOR, HIER_STRENGTH, HIER_WIDTH } from "../config.js";
import { buildAdjacency, SCORE_KEYS, topKEdges, type ScoreKey } from "../lib/edgeRank.js";
import type { Graph } from "../lib/types.js";

/** One row per node, in node index order. */
export interface PointRow extends Record<string, unknown> {
  id: string;
  idx: number;
  label: string;
  card_count: number;
  size: number;
  /** Community name, or null when unclustered. */
  cluster: string | null;
  color: string;
}

export interface LinkRow extends Record<string, unknown> {
  source: string;
  target: string;
  sourceidx: number;
  targetidx: number;
  /** Index into graph.edges. */
  edge: number;
  kind: "co" | "h";
  strength: number;
  width: number;
  color: string;
}

export function pointRows(graph: Pick<Graph, "nodes" | "meta">, colors: readonly string[]): PointRow[] {
  const names = graph.meta.communities.map((c) => c.name);
  return graph.nodes.map((n) => ({
    id: n.id,
    idx: n.i,
    label: n.label,
    card_count: n.card_count,
    size: Math.sqrt(n.card_count),
    cluster: n.community >= 0 ? (names[n.community] ?? null) : null,
    color: colors[n.i]!,
  }));
}

export function linkRows(graph: Pick<Graph, "nodes" | "edges">, edgeIndexes: Iterable<number>): LinkRow[] {
  const rows: LinkRow[] = [];
  for (const i of edgeIndexes) {
    const e = graph.edges[i]!;
    const co = e.type === "co";
    rows.push({
      source: graph.nodes[e.s]!.id,
      target: graph.nodes[e.t]!.id,
      sourceidx: e.s,
      targetidx: e.t,
      edge: i,
      kind: e.type,
      strength: co ? e.npmi : HIER_STRENGTH,
      width: co ? e.npmi : HIER_WIDTH,
      color: co ? CO_LINK_COLOR : HIER_LINK_COLOR,
    });
  }
  return rows;
}

export interface Filter {
  score: ScoreKey;
  k: number;
  /** Minimum score; edges below it are skipped. */
  min: number;
  hierarchy: boolean;
}

/** Per-score sorted adjacency lists, built once per graph. */
export type AdjacencyByScore = Record<ScoreKey, number[][]>;

export function adjacencyByScore(graph: Pick<Graph, "nodes" | "edges">): AdjacencyByScore {
  const out = {} as AdjacencyByScore;
  for (const key of SCORE_KEYS) out[key] = buildAdjacency(graph.edges, graph.nodes.length, key);
  return out;
}

/** Edge indexes to show: each tag's top k co edges at or above the floor, plus h edges if on. */
export function visibleEdges(
  graph: Pick<Graph, "edges">,
  adjacency: AdjacencyByScore,
  { score, k, min, hierarchy }: Filter,
): number[] {
  const keep = topKEdges(adjacency[score], graph.edges, score, k, min);
  if (hierarchy) graph.edges.forEach((e, i) => e.type === "h" && keep.add(i));
  return [...keep].sort((a, b) => a - b);
}
