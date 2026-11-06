import { describe, expect, it } from "vitest";
import { readJsonl } from "../src/lib/jsonl.js";
import { toCard } from "../src/lib/cards.js";
import { buildGraph } from "../src/lib/graph.js";
import { cooccurrenceEdges } from "../src/lib/cooccurrence.js";
import { indexTags } from "../src/lib/tags.js";
import type { Card, CooccurrenceEdge, RawCard, RawTag } from "../src/lib/types.js";

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

describe("co-occurrence (hand-checked fixture)", () => {
  it("matches the expected edge map and excludes parent tags", async () => {
    const { index, cards } = await load();
    const g = buildGraph(index, cards, 1);
    const co = g.edges.filter((e): e is CooccurrenceEdge => e.type === "cooccurrence");
    const got = Object.fromEntries(co.map((e) => [key(e), [e.count, e.score]]));
    expect(got).toEqual({
      "t-creature-removal|t-draw": [3, 2],
      "t-artifact-removal|t-creature-removal": [1, 0.5],
      "t-artifact-removal|t-draw": [1, 1],
      "t-artifact-removal|t-ramp": [1, 1],
    });
    expect(co.some((e) => e.source === "t-removal" || e.target === "t-removal")).toBe(false);
  });

  it("drops edges below minCount", async () => {
    const { index, cards } = await load();
    const g = buildGraph(index, cards, 2);
    const co = g.edges.filter((e): e is CooccurrenceEdge => e.type === "cooccurrence");
    expect(co.map(key)).toEqual(["t-creature-removal|t-draw"]);
  });

  it("emits hierarchy edges and resolved card counts", async () => {
    const { index, cards } = await load();
    const g = buildGraph(index, cards, 1);
    const h = g.edges.filter((e) => e.type === "hierarchy").map((e) => `${e.source}>${e.target}`).sort();
    expect(h).toEqual(["t-removal>t-artifact-removal", "t-removal>t-creature-removal"]);
    const removal = g.nodes.find((n) => n.id === "t-removal")!;
    expect(removal).toMatchObject({ card_count: 4, is_leaf: false });
  });

  it("counts a tag once per card even if listed twice", () => {
    const edges = cooccurrenceEdges(
      [{ tags: [{ id: "a", weight: 1 }, { id: "a", weight: 0.5 }, { id: "b", weight: 1 }] }],
      () => true,
    );
    expect(edges).toEqual([{ source: "a", target: "b", type: "cooccurrence", count: 1, score: 1 }]);
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
