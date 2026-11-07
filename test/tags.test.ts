import { describe, expect, it } from "vitest";
import { hierarchyPairs, indexTags, isLeaf, resolveTagCards, taggingWeight } from "../src/lib/tags.js";
import type { RawTag } from "../src/lib/types.js";

const tag = (id: string, extra: Partial<RawTag> = {}): RawTag => ({ id, type: "oracle", label: id, ...extra });

describe("tag hierarchy", () => {
  const tags = [
    tag("parent", { child_ids: ["a", "b"] }),
    tag("a", { parent_ids: ["parent"], taggings: [{ oracle_id: "c1" }, { oracle_id: "c2" }] }),
    tag("b", { parent_ids: ["parent"], taggings: [{ oracle_id: "c2" }, { oracle_id: "c3" }] }),
  ];

  it("parent's card set is the union of its children", () => {
    const r = resolveTagCards(indexTags(tags));
    expect([...r.get("parent")!].sort()).toEqual(["c1", "c2", "c3"]);
    expect([...r.get("a")!].sort()).toEqual(["c1", "c2"]);
  });

  it("walks more than one level", () => {
    const deep = [tag("top", { child_ids: ["parent"] }), ...tags];
    const r = resolveTagCards(indexTags(deep));
    expect(r.get("top")!.size).toBe(3);
  });

  it("learns a link from parent_ids alone", () => {
    const idx = indexTags([tag("p"), tag("k", { parent_ids: ["p"], taggings: [{ oracle_id: "c9" }] })]);
    expect(isLeaf(idx, "p")).toBe(false);
    expect(hierarchyPairs(idx)).toEqual([["p", "k"]]);
  });

  it("survives cycles", () => {
    const cyc = [
      tag("x", { child_ids: ["y"], taggings: [{ oracle_id: "c1" }] }),
      tag("y", { child_ids: ["x"], taggings: [{ oracle_id: "c2" }] }),
    ];
    const r = resolveTagCards(indexTags(cyc));
    expect(r.get("x")!.has("c2")).toBe(true);
  });

  it("ignores links to unknown tags and non-oracle tags", () => {
    const idx = indexTags([tag("a", { child_ids: ["missing"] }), tag("art", { type: "illustration" })]);
    expect(isLeaf(idx, "a")).toBe(true);
    expect(idx.tags.has("art")).toBe(false);
  });

  it("limits card sets to known cards when given", () => {
    const r = resolveTagCards(indexTags(tags), new Set(["c1"]));
    expect([...r.get("parent")!]).toEqual(["c1"]);
  });

  it("defaults missing weight to 1", () => {
    expect(indexTags(tags).cardTags.get("c1")).toEqual([{ id: "a", weight: 1 }]);
  });
});

describe("taggingWeight", () => {
  it("maps Scryfall's level names, in any case or spelling", () => {
    expect(taggingWeight("very_strong")).toBe(1);
    expect(taggingWeight("VeryStrong")).toBe(1);
    expect(taggingWeight("strong")).toBe(0.75);
    expect(taggingWeight("median")).toBe(0.5);
    expect(taggingWeight("Weak")).toBe(0.25);
  });

  it("passes numbers through and defaults a missing weight", () => {
    expect(taggingWeight(0.3)).toBe(0.3);
    expect(taggingWeight(undefined)).toBe(1);
  });

  it("fails loudly on an unknown level", () => {
    expect(() => taggingWeight("legendary")).toThrow(/legendary/);
  });

  it("is applied when indexing tags", () => {
    const idx = indexTags([tag("a", { taggings: [{ oracle_id: "c1", weight: "very_strong" }] })]);
    expect(idx.cardTags.get("c1")).toEqual([{ id: "a", weight: 1 }]);
  });
});
