import { describe, expect, it } from "vitest";
import { hierarchyPairs, indexTags, isLeaf, resolveTagCards } from "../src/lib/tags.js";
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
