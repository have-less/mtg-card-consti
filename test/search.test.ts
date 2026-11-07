import { describe, expect, it } from "vitest";
import type { Card, GraphNode } from "../src/lib/types.js";
import type { TagCard } from "../src/viewer/cardIndex.js";
import { filterCards, searchTags } from "../src/viewer/search.js";

const node = (i: number, label: string, card_count: number, slug = label.replace(/ /g, "-")): GraphNode => ({
  i,
  id: `t${i}`,
  label,
  slug,
  card_count,
  is_leaf: true,
  depth: 0,
  root_parent: i,
  community: -1,
  dominant_color: "C",
  degree_shipped: 0,
});

describe("searchTags", () => {
  const nodes = [
    node(0, "removal", 500),
    node(1, "creature removal", 900),
    node(2, "removal-artifact", 40),
    node(3, "ramp", 700),
    node(4, "mana rock", 50, "manarock"),
  ];
  const labels = (q: string, limit?: number) => searchTags(nodes, q, limit).map((n) => n.label);

  it("ranks prefix matches first, then substring matches, each by card count", () => {
    expect(labels("remov")).toEqual(["removal", "removal-artifact", "creature removal"]);
  });

  it("ignores case and treats dashes like spaces", () => {
    expect(labels("REMOVAL ART")).toEqual(["removal-artifact"]);
  });

  it("matches the slug too", () => {
    expect(labels("manarock")).toEqual(["mana rock"]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(labels("  ")).toEqual([]);
    expect(labels("r", 2)).toEqual(["ramp", "removal"]);
  });
});

describe("filterCards", () => {
  const tc = (name: string, type_line: string, oracle_text = ""): TagCard => ({
    card: { name, type_line, oracle_text } as Card,
    weight: 0.5,
  });
  const cards = [
    tc("Llanowar Elves", "Creature — Elf Druid", "{T}: Add {G}."),
    tc("Sol Ring", "Artifact", "{T}: Add {C}{C}."),
    tc("Elvish Mystic", "Creature — Elf Druid", "{T}: Add {G}."),
  ];
  const names = (q: string) => filterCards(cards, q).map((c) => c.card.name);

  it("matches name, type line and rules text, keeping order", () => {
    expect(names("elf")).toEqual(["Llanowar Elves", "Elvish Mystic"]);
    expect(names("artifact")).toEqual(["Sol Ring"]);
    expect(names("{c}")).toEqual(["Sol Ring"]);
  });

  it("requires every word", () => {
    expect(names("druid mystic")).toEqual(["Elvish Mystic"]);
  });

  it("returns everything for an empty query", () => {
    expect(names("")).toHaveLength(3);
  });
});
