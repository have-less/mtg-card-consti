import { describe, expect, it } from "vitest";
import type { Card, Graph, GraphNode } from "../src/lib/types.js";
import { buildCardIndex } from "../src/viewer/cardIndex.js";

const node = (i: number, id: string): GraphNode => ({
  i,
  id,
  label: id,
  slug: id,
  card_count: 0,
  is_leaf: true,
  depth: 0,
  root_parent: i,
  community: -1,
  dominant_color: "C",
  degree_shipped: 0,
});

const card = (name: string, tags: [string, number][]): Card =>
  ({ oracle_id: name, name, tags: tags.map(([id, weight]) => ({ id, weight })) }) as Card;

// "parent" has children "a" and "b".
const graph: Pick<Graph, "nodes" | "edges"> = {
  nodes: [node(0, "parent"), node(1, "a"), node(2, "b")],
  edges: [
    { s: 0, t: 1, type: "h" },
    { s: 0, t: 2, type: "h" },
    { s: 1, t: 2, type: "co", count: 3, score: 1, npmi: 0.5, cosine: 0.5 },
  ],
};
const cards = [
  card("Zebra", [["a", 0.5]]),
  card("Apple", [["a", 0.5], ["b", 1]]),
  card("Mango", [["b", 0.5]]),
];

describe("buildCardIndex", () => {
  const index = buildCardIndex(graph, cards);
  const names = (i: number) => index.cardsForTag(i).map((c) => c.card.name);

  it("lists a leaf's direct cards, strongest weight first, then by name", () => {
    expect(names(1)).toEqual(["Apple", "Zebra"]);
    expect(names(2)).toEqual(["Apple", "Mango"]);
    expect(index.cardsForTag(2)[0]!.weight).toBe(1);
  });

  it("gives a parent every descendant's cards once, at their best weight", () => {
    expect(names(0)).toEqual(["Apple", "Mango", "Zebra"]);
    expect(index.cardsForTag(0)[0]!.weight).toBe(1);
  });
});
