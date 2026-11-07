import { describe, expect, it } from "vitest";
import { COLOR_IDENTITY_COLORS, HIER_STRENGTH, OTHER_COLOR, PALETTE_12 } from "../src/config.js";
import type { Graph, GraphNode } from "../src/lib/types.js";
import { colorNodes } from "../src/viewer/colors.js";
import { adjacencyByScore, linkRows, pointRows, visibleEdges } from "../src/viewer/viewData.js";

const node = (i: number, extra: Partial<GraphNode> = {}): GraphNode => ({
  i,
  id: `t${i}`,
  label: `tag ${i}`,
  slug: `tag-${i}`,
  card_count: 16,
  is_leaf: true,
  depth: 1,
  root_parent: 0,
  community: 0,
  dominant_color: "U",
  degree_shipped: 0,
  ...extra,
});

// 0 is a parent of 1 and 2. Leaves 1-4 have co edges.
const graph: Graph = {
  generated_at: "",
  meta: {
    N: 100,
    min_count: 3,
    ship_k: 30,
    community_resolution: 1,
    community_count: 2,
    communities: [
      { id: 0, name: "big", size: 3 },
      { id: 1, name: "small", size: 1 },
    ],
  },
  nodes: [
    node(0, { is_leaf: false, depth: 0, card_count: 100 }),
    node(1),
    node(2, { community: 1, dominant_color: "M" }),
    node(3, { community: -1, root_parent: 3, depth: 0, card_count: 9 }),
    node(4, { root_parent: 4, depth: 0, card_count: 4 }),
  ],
  edges: [
    { s: 1, t: 2, type: "co", count: 10, score: 2.5, npmi: 0.6, cosine: 0.3 },
    { s: 1, t: 3, type: "co", count: 40, score: 10, npmi: 0.2, cosine: 0.5 },
    { s: 2, t: 4, type: "co", count: 3, score: 0.75, npmi: 0.1, cosine: 0.1 },
    { s: 0, t: 1, type: "h" },
    { s: 0, t: 2, type: "h" },
  ],
};

describe("visibleEdges", () => {
  const adj = adjacencyByScore(graph);

  it("takes each tag's top k under the chosen score, plus hierarchy", () => {
    expect(visibleEdges(graph, adj, { score: "npmi", k: 1, min: 0, hierarchy: true })).toEqual([0, 1, 2, 3, 4]);
    expect(visibleEdges(graph, adj, { score: "npmi", k: 1, min: 0, hierarchy: false })).toEqual([0, 1, 2]);
  });

  it("applies the minimum score", () => {
    expect(visibleEdges(graph, adj, { score: "npmi", k: 5, min: 0.15, hierarchy: false })).toEqual([0, 1]);
    expect(visibleEdges(graph, adj, { score: "count", k: 5, min: 10, hierarchy: false })).toEqual([0, 1]);
  });
});

describe("pointRows and linkRows", () => {
  it("derives size, cluster name and color per node", () => {
    const rows = pointRows(graph, ["a", "b", "c", "d", "e"]);
    expect(rows[1]).toMatchObject({ id: "t1", idx: 1, size: 4, cluster: "big", color: "b" });
    expect(rows[3]!.cluster).toBeNull();
  });

  it("uses npmi for co links and the hierarchy constants for h links", () => {
    const [co, h] = linkRows(graph, [0, 3]);
    expect(co).toMatchObject({ source: "t1", target: "t2", sourceidx: 1, targetidx: 2, edge: 0, kind: "co", strength: 0.6, width: 0.6 });
    expect(h).toMatchObject({ source: "t0", target: "t1", edge: 3, kind: "h", strength: HIER_STRENGTH });
  });
});

describe("colorNodes", () => {
  it("colors by community, with gray for unclustered", () => {
    const { colors, legend } = colorNodes(graph, "community");
    expect(colors).toEqual([PALETTE_12[0], PALETTE_12[0], PALETTE_12[1], OTHER_COLOR, PALETTE_12[0]]);
    expect(legend.map((l) => l.label)).toEqual(["big", "small", "other"]);
  });

  it("colors by top-level parent, largest root first", () => {
    const { colors, legend } = colorNodes(graph, "root");
    expect(legend.map((l) => l.label)).toEqual(["tag 0", "tag 3", "tag 4", "other"]);
    expect(colors[3]).toBe(PALETTE_12[1]);
    expect(colors[4]).toBe(PALETTE_12[2]);
  });

  it("colors by dominant color identity", () => {
    const { colors } = colorNodes(graph, "identity");
    expect(colors[1]).toBe(COLOR_IDENTITY_COLORS.U);
    expect(colors[2]).toBe(COLOR_IDENTITY_COLORS.M);
  });
});
