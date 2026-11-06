import { describe, expect, it } from "vitest";
import { readJsonl } from "../src/lib/jsonl.js";
import { toCard } from "../src/lib/cards.js";
import { buildGraph } from "../src/lib/graph.js";
import { cooccurrence } from "../src/lib/cooccurrence.js";
import { indexTags, isLeaf } from "../src/lib/tags.js";
import type { Card, CoEdge, CooccurrenceEdge, Graph, RawCard, RawTag } from "../src/lib/types.js";

async function load() {
  const rawTags: RawTag[] = [];
  for await (const t of readJsonl<RawTag>("test/fixtures/oracle_tags-fixture.jsonl")) rawTags.push(t);
  const index = indexTags(rawTags);
  const cards: Card[] = [];
  for await (const rc of readJsonl<RawCard>("test/fixtures/oracle_cards-fixture.jsonl")) {
    const c = toCard(rc, rc.oracle_id ? (index.cardTags.get(rc.oracle_id) ?? []) : []);
    if (c) cards.push(c);
  }
  return { index, cards };
}

const key = (e: CooccurrenceEdge) => `${e.source}|${e.target}`;
const coEdges = (g: Graph) => g.edges.filter((e): e is CoEdge => e.type === "co");
const node = (g: Graph, id: string) => g.nodes.find((n) => n.id === id)!;

// Leaf tags on the 4 fixture cards, so N = 4:
//   creature-removal {c1,c2,c3}  artifact-removal {c2,c4}  draw {c1,c2,c3}  ramp {c4}
describe("co-occurrence (hand-checked fixture)", () => {
  it("matches the expected edge map and excludes parent tags", async () => {
    const { index, cards } = await load();
    const { graph: g } = buildGraph(index, cards, { minCount: 1 });
    const id = (i: number) => g.nodes[i]!.id;
    const got = Object.fromEntries(
      coEdges(g).map((e) => [`${id(e.s)}|${id(e.t)}`, [e.count, e.score, e.npmi, e.cosine]]),
    );
    expect(got).toEqual({
      // ln(4*3/(3*3)) / -ln(3/4) = 1; 3 / sqrt(3*3) = 1
      "t-creature-removal|t-draw": [3, 2, 1, 1],
      // ln(4*1/(2*1)) / -ln(1/4) = ln 2 / ln 4 = 0.5; 1 / sqrt(2) = 0.707
      "t-artifact-removal|t-ramp": [1, 1, 0.5, 0.707],
      // artifact-removal with creature-removal or draw: ln(4/6) < 0, dropped
    });
    expect(g.meta.N).toBe(4);
  });

  it("reports N, per-tag counts and pair counts before filtering", async () => {
    const { cards, index } = await load();
    const r = cooccurrence(cards, (id) => isLeaf(index, id), 1);
    expect(r.n).toBe(4);
    expect(Object.fromEntries(r.tagCounts)).toEqual({
      "t-creature-removal": 3,
      "t-artifact-removal": 2,
      "t-draw": 3,
      "t-ramp": 1,
    });
    expect(r.pairsBeforeFilter).toBe(4);
    expect(r.pairsAfterMinCount).toBe(4);
  });

  it("drops pairs at or below chance (npmi <= 0)", () => {
    // a and b each on 2 of 4 cards, sharing 1: exactly chance, npmi = 0.
    const t = (...ids: string[]) => ({ tags: ids.map((id) => ({ id, weight: 1 })) });
    const r = cooccurrence([t("a", "b"), t("a", "x"), t("b", "y"), t("x", "y")], () => true);
    expect(r.edges.map(key)).not.toContain("a|b");
    expect(r.pairsAfterMinCount).toBe(4);
  });

  it("drops edges below minCount", async () => {
    const { index, cards } = await load();
    const { graph: g, stats } = buildGraph(index, cards, { minCount: 2 });
    expect(coEdges(g).map((e) => `${g.nodes[e.s]!.id}|${g.nodes[e.t]!.id}`)).toEqual([
      "t-creature-removal|t-draw",
    ]);
    expect(stats.pairsAfterMinCount).toBe(1);
  });

  it("counts a tag once per card even if listed twice", () => {
    const { edges } = cooccurrence(
      [{ tags: [{ id: "a", weight: 1 }, { id: "a", weight: 0.5 }, { id: "b", weight: 1 }] }],
      () => true,
    );
    expect(edges).toEqual([
      { source: "a", target: "b", type: "cooccurrence", count: 1, score: 1, npmi: 1, cosine: 1 },
    ]);
  });
});

describe("graph.json shape", () => {
  it("indexes nodes by position and points edges at indexes", async () => {
    const { index, cards } = await load();
    const { graph: g } = buildGraph(index, cards, { minCount: 1 });
    g.nodes.forEach((n, i) => expect(n.i).toBe(i));
    for (const e of coEdges(g)) expect(e.s).toBeLessThan(e.t);
    const h = g.edges
      .filter((e) => e.type === "h")
      .map((e) => `${g.nodes[e.s]!.id}>${g.nodes[e.t]!.id}`)
      .sort();
    expect(h).toEqual(["t-removal>t-artifact-removal", "t-removal>t-creature-removal"]);
  });

  it("adds hierarchy and color fields", async () => {
    const { index, cards } = await load();
    const { graph: g } = buildGraph(index, cards, { minCount: 1 });
    const removal = node(g, "t-removal");
    expect(removal).toMatchObject({ card_count: 4, is_leaf: false, depth: 0, root_parent: removal.i });
    expect(node(g, "t-creature-removal")).toMatchObject({ depth: 1, root_parent: removal.i });
    // Cards: c1 B, c2 UB (M), c3 R, c4 colorless
    expect(node(g, "t-creature-removal").dominant_color).toBe("B"); // B, M, R tie: WUBRG order
    expect(node(g, "t-artifact-removal").dominant_color).toBe("M"); // M, C tie
    expect(node(g, "t-ramp").dominant_color).toBe("C");
    expect(node(g, "t-draw").degree_shipped).toBe(1);
    expect(removal.degree_shipped).toBe(0);
  });

  it("assigns communities and names them in meta", async () => {
    const { index, cards } = await load();
    const { graph: g } = buildGraph(index, cards, { minCount: 1 });
    // Two pairs of equal size; the one holding the lowest node index (artifact-removal) is 0.
    expect(node(g, "t-artifact-removal").community).toBe(0);
    expect(node(g, "t-ramp").community).toBe(0);
    expect(node(g, "t-creature-removal").community).toBe(1);
    expect(node(g, "t-draw").community).toBe(1);
    expect(node(g, "t-removal").community).toBe(0); // children split 0 and 1: tie goes to 0
    expect(g.meta.community_count).toBe(2);
    expect(g.meta.communities).toEqual([
      { id: 0, name: "artifact removal / ramp", size: 2 },
      { id: 1, name: "creature removal / draw", size: 2 },
    ]);
  });
});

describe("toCard", () => {
  it("normalizes color identity and falls back to card faces", async () => {
    const { cards } = await load();
    expect(cards).toHaveLength(4); // the card without oracle_id is skipped
    const c2 = cards.find((c) => c.oracle_id === "c2")!;
    expect(c2.color_identity_key).toBe("UB");
    const c3 = cards.find((c) => c.oracle_id === "c3")!;
    expect(c3.mana_cost).toBe("{2}{R} // {R}");
    expect(c3.image_uris.normal).toBe("n3");
    expect(cards.find((c) => c.oracle_id === "c4")!.color_identity_key).toBe("C");
  });
});
