import { describe, expect, it } from "vitest";
import { cardLinks, deckCardRows, deckTagRows, deckTags } from "../src/deck/deckGraph.js";
import { isLand, matchDeck, normalizeName, parseDeckList } from "../src/deck/deckList.js";
import type { Card, Graph, GraphNode } from "../src/lib/types.js";

const node = (i: number, id: string, community = -1): GraphNode => ({
  i,
  id,
  label: id,
  slug: id,
  card_count: 0,
  is_leaf: true,
  depth: 0,
  root_parent: i,
  community,
  dominant_color: "C",
  degree_shipped: 0,
});

const card = (name: string, tags: string[], ci = "C"): Card =>
  ({
    oracle_id: `id-${name}`,
    name,
    color_identity_key: ci,
    tags: tags.map((id) => ({ id, weight: 0.5 })),
  }) as Card;

describe("parseDeckList", () => {
  it("reads counts, bare names, and exporter suffixes", () => {
    const text = [
      "Commander",
      "1 Atraxa, Praetors' Voice (CM2) 10 *F*",
      "",
      "Deck",
      "1x Sol Ring [Ramp] ^Have^",
      "Creatures (2)",
      "Lightning Bolt",
      "// a comment",
      "# another",
      "SB: 1 Swords to Plowshares",
      "Sideboard:",
    ].join("\n");
    expect(parseDeckList(text)).toEqual(["Atraxa, Praetors' Voice", "Sol Ring", "Lightning Bolt", "Swords to Plowshares"]);
  });

  it("keeps each card once", () => {
    expect(parseDeckList("1 Sol Ring\n1 sol ring\nSol Ring")).toEqual(["Sol Ring"]);
  });
});

describe("matchDeck", () => {
  const cards = [card("Sol Ring", []), card("Fire // Ice", []), card("Lim-Dûl's Vault", []), card("Ice", [])];

  it("matches full names loosely and reports misses", () => {
    const { cards: found, missing } = matchDeck(["sol  ring", "Lim-Dul’s Vault", "Fire/Ice", "Nope"], cards);
    expect(found.map((c) => c.name)).toEqual(["Sol Ring", "Lim-Dûl's Vault", "Fire // Ice"]);
    expect(missing).toEqual(["Nope"]);
  });

  it("matches one face, preferring a card with that full name", () => {
    expect(matchDeck(["Fire"], cards).cards.map((c) => c.name)).toEqual(["Fire // Ice"]);
    expect(matchDeck(["Ice"], cards).cards.map((c) => c.name)).toEqual(["Ice"]);
  });

  it("normalizes names", () => {
    expect(normalizeName("  Fire//Ice ")).toBe("fire // ice");
  });
});

describe("isLand", () => {
  it("goes by the front face", () => {
    expect(isLand({ type_line: "Basic Land — Island" })).toBe(true);
    expect(isLand({ type_line: "Land Creature — Forest Dryad" })).toBe(true);
    expect(isLand({ type_line: "Land // Land" })).toBe(true);
    expect(isLand({ type_line: "Sorcery // Land" })).toBe(false);
    expect(isLand({ type_line: "Enchantment — Aura" })).toBe(false);
  });
});

// "parent" has children "a" and "b"; "c" is unrelated.
const graph: Pick<Graph, "nodes" | "edges" | "meta"> = {
  nodes: [node(0, "parent"), node(1, "a", 0), node(2, "b", 0), node(3, "c")],
  edges: [
    { s: 0, t: 1, type: "h" },
    { s: 0, t: 2, type: "h" },
    { s: 1, t: 2, type: "co", count: 3, score: 1, npmi: 0.5, cosine: 0.5 },
    { s: 2, t: 3, type: "co", count: 3, score: 1, npmi: 0.4, cosine: 0.4 },
  ],
  meta: { N: 0, min_count: 3, ship_k: 30, community_resolution: 1, community_count: 1, communities: [{ id: 0, name: "ab", size: 2 }] },
};

describe("deck tag view", () => {
  const deck = [card("X", ["a", "b"]), card("Y", ["a"]), card("Z", ["c"])];
  const tags = deckTags(graph, deck);

  it("lists the tags on deck cards, most cards first", () => {
    expect(tags.map((t) => [t.node.id, t.cards.length])).toEqual([["a", 2], ["b", 1], ["c", 1]]);
  });

  it("keeps the graph's edges between shown tags, indexed locally", () => {
    const shown = tags.filter((t) => t.node.id !== "c");
    const { points, links } = deckTagRows(graph, shown, ["#0", "#1", "#2", "#3"]);
    expect(points.map((p) => [p.id, p.idx, p.size, p.cluster, p.color])).toEqual([
      ["a", 0, 2, "ab", "#1"],
      ["b", 1, 1, "ab", "#2"],
    ]);
    expect(links.map((l) => [l.sourceidx, l.targetidx, l.edge])).toEqual([[0, 1, 2]]);
  });
});

describe("deck card view", () => {
  const deck = [card("P", ["a", "b", "c"], "W"), card("Q", ["a", "b"], "WU"), card("R", ["c"]), card("S", ["d"])];

  it("links cards that share tags, keeping each card's top k", () => {
    expect(cardLinks(deck, 5)).toEqual([
      { a: 0, b: 1, shared: 2 },
      { a: 0, b: 2, shared: 1 },
    ]);
    expect(cardLinks(deck, 1)).toEqual([
      { a: 0, b: 1, shared: 2 },
      { a: 0, b: 2, shared: 1 },
    ]);
  });

  it("ignores hidden tags when counting shared tags", () => {
    expect(cardLinks(deck, 5, new Set(["a", "c"]))).toEqual([{ a: 0, b: 1, shared: 1 }]);
  });

  it("sizes cards by kept links and colors them by identity", () => {
    const { points, links } = deckCardRows(deck, cardLinks(deck, 5));
    expect(points.map((p) => p.size)).toEqual([3, 2, 2, 1]);
    expect(points.map((p) => p.color)).toEqual(["#E9E2C0", "#D4AF37", "#9AA0A6", "#9AA0A6"]);
    expect(links.map((l) => l.strength)).toEqual([1, 0.5]);
  });
});
