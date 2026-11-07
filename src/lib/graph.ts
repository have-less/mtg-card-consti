import { COMMUNITY_K, COMMUNITY_RESOLUTION, COMMUNITY_SEED, MIN_COUNT, SHIP_K } from "../config.js";
import { describeCommunities, leafCommunities, withParentCommunities } from "./communities.js";
import { cooccurrence } from "./cooccurrence.js";
import { shippedEdges } from "./edgeRank.js";
import { dominantColor, rootParents } from "./nodeFields.js";
import { hierarchyPairs, isLeaf, resolveTagCards, type TagIndex } from "./tags.js";
import type { Card, CoEdge, Graph, GraphNode, HierEdge } from "./types.js";

export interface BuildOptions {
  minCount?: number;
  shipK?: number;
  communityK?: number;
  communityResolution?: number;
  communitySeed?: number;
  now?: Date;
}

/** Numbers for the prep stats report that don't end up in graph.json. */
export interface BuildStats {
  pairsBeforeFilter: number;
  pairsAfterMinCount: number;
  /** All edges with count >= minCount and npmi > 0, before shipping. */
  scoredEdges: CoEdge[];
}

export function buildGraph(
  index: TagIndex,
  cards: Card[],
  {
    minCount = MIN_COUNT,
    shipK = SHIP_K,
    communityK = COMMUNITY_K,
    communityResolution = COMMUNITY_RESOLUTION,
    communitySeed = COMMUNITY_SEED,
    now = new Date(),
  }: BuildOptions = {},
): { graph: Graph; stats: BuildStats } {
  const known = new Set(cards.map((c) => c.oracle_id));
  const resolved = resolveTagCards(index, known);
  const leaf = (id: string) => isLeaf(index, id);
  const colorKeyOf = new Map(cards.map((c) => [c.oracle_id, c.color_identity_key]));

  const ids = [...index.tags.keys()].sort();
  const pos = new Map(ids.map((id, i) => [id, i]));
  const cardCount = ids.map((id) => resolved.get(id)?.size ?? 0);

  const isLeafAt = ids.map(leaf);
  const parents: number[][] = ids.map(() => []);
  const children: number[][] = ids.map(() => []);
  const hier: HierEdge[] = hierarchyPairs(index)
    .map(([p, c]) => ({ s: pos.get(p)!, t: pos.get(c)!, type: "h" as const }))
    .sort((a, b) => a.s - b.s || a.t - b.t);
  for (const e of hier) {
    parents[e.t]!.push(e.s);
    children[e.s]!.push(e.t);
  }
  const { root, depth } = rootParents(parents, cardCount);

  const co = cooccurrence(cards, leaf, minCount);
  const scored: CoEdge[] = co.edges
    .map((e) => {
      const [s, t] = [pos.get(e.source)!, pos.get(e.target)!].sort((a, b) => a - b) as [number, number];
      return { s, t, type: "co" as const, count: e.count, score: e.score, npmi: e.npmi, cosine: e.cosine };
    })
    .sort((a, b) => a.s - b.s || a.t - b.t);
  const shipped = shippedEdges(scored, ids.length, shipK).map((i) => scored[i]!);

  const degree = new Array<number>(ids.length).fill(0);
  for (const e of shipped) {
    degree[e.s]!++;
    degree[e.t]!++;
  }

  const community = withParentCommunities(
    leafCommunities(shipped, ids.length, { k: communityK, resolution: communityResolution, seed: communitySeed }),
    children,
    isLeafAt,
  );

  const nodes: GraphNode[] = ids.map((id, i) => {
    const t = index.tags.get(id)!;
    return {
      i,
      id,
      label: t.label,
      slug: t.slug ?? "",
      card_count: cardCount[i]!,
      is_leaf: isLeafAt[i]!,
      depth: depth[i]!,
      root_parent: root[i]!,
      community: community[i]!,
      dominant_color: dominantColor([...(resolved.get(id) ?? [])].map((c) => colorKeyOf.get(c)!)),
      degree_shipped: degree[i]!,
    };
  });

  const communities = describeCommunities(community, nodes);

  return {
    graph: {
      generated_at: now.toISOString(),
      meta: {
        N: co.n,
        min_count: minCount,
        ship_k: shipK,
        community_resolution: communityResolution,
        community_count: communities.length,
        communities,
      },
      nodes,
      edges: [...shipped, ...hier],
    },
    stats: {
      pairsBeforeFilter: co.pairsBeforeFilter,
      pairsAfterMinCount: co.pairsAfterMinCount,
      scoredEdges: scored,
    },
  };
}
