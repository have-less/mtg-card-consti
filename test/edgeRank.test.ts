import { describe, expect, it } from "vitest";
import { buildAdjacency, shippedEdges, topKEdges, type RankableEdge } from "../src/lib/edgeRank.js";

const co = (s: number, t: number, npmi: number, cosine = npmi, count = 3, score = 1): RankableEdge => ({
  s,
  t,
  type: "co",
  npmi,
  cosine,
  count,
  score,
});

describe("topKEdges", () => {
  it("unions each endpoint's top k, so small tags stay connected", () => {
    // Hub 0 keeps only its best edge at k=1, but 3 has no other edge so 0-3 stays.
    // 2 prefers 2-4, so 0-2 is in nobody's top 1.
    const edges = [co(0, 1, 0.9), co(0, 2, 0.8), co(0, 3, 0.7), co(2, 4, 0.95)];
    const adj = buildAdjacency(edges, 5, "npmi");
    expect([...topKEdges(adj, edges, "npmi", 1)].sort()).toEqual([0, 2, 3]);
    expect([...topKEdges(adj, edges, "npmi", 2)].sort()).toEqual([0, 1, 2, 3]);
  });

  it("skips edges below the floor and takes the next ones", () => {
    const edges = [co(0, 1, 0.9), co(0, 2, 0.2), co(0, 3, 0.6)];
    const adj = buildAdjacency(edges, 4, "npmi");
    expect([...topKEdges(adj, edges, "npmi", 1, 0.5)].sort()).toEqual([0, 2]);
  });

  it("ranks by the chosen score and ignores hierarchy edges", () => {
    const edges: RankableEdge[] = [co(0, 1, 0.9, 0.1), co(0, 2, 0.1, 0.9), { s: 0, t: 1, type: "h" }];
    const adj = buildAdjacency(edges, 3, "cosine");
    expect(adj[0]).toEqual([1, 0]);
    expect(adj[1]).toEqual([0]);
  });
});

describe("shippedEdges", () => {
  it("keeps an edge in the top k of either endpoint under any score", () => {
    const edges = [
      co(0, 1, 0.9, 0.1, 3, 1), // node 0's best npmi
      co(0, 2, 0.5, 0.9, 3, 1), // node 0's best cosine
      co(0, 3, 0.4, 0.2, 50, 1), // node 0's best count
      co(0, 4, 0.3, 0.2, 4, 20), // node 0's best weighted count
      co(1, 2, 0.1, 0.05, 3, 0.5), // second for both 1 and 2 under every score
    ];
    expect(shippedEdges(edges, 5, 1)).toEqual([0, 1, 2, 3]);
    expect(shippedEdges(edges, 5, 2)).toEqual([0, 1, 2, 3, 4]);
  });
});
