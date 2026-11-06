import { describe, expect, it } from "vitest";
import {
  describeCommunities,
  leafCommunities,
  mulberry32,
  renumberBySize,
  withParentCommunities,
} from "../src/lib/communities.js";
import type { RankableEdge } from "../src/lib/edgeRank.js";

const co = (s: number, t: number, npmi: number): RankableEdge => ({ s, t, type: "co", npmi, cosine: npmi, count: 3, score: 1 });

// Two triangles (0-1-2 and 3-4-5, plus 6 hanging off 5) joined by one weak edge; node 7 is isolated.
const twoClusters = [
  co(0, 1, 0.9), co(0, 2, 0.9), co(1, 2, 0.9),
  co(3, 4, 0.9), co(3, 5, 0.9), co(4, 5, 0.9), co(5, 6, 0.8),
  co(2, 3, 0.05),
];
const opts = { k: 5, resolution: 1, seed: 1 };

describe("renumberBySize", () => {
  it("makes the largest community 0 and keeps -1", () => {
    expect(renumberBySize([7, 3, 3, -1, 3, 7, 9])).toEqual([1, 0, 0, -1, 0, 1, 2]);
  });

  it("breaks size ties by the lowest member index", () => {
    expect(renumberBySize([5, 2, 5, 2])).toEqual([0, 1, 0, 1]);
  });
});

describe("leafCommunities", () => {
  it("finds the two clusters, largest first, and leaves isolated tags at -1", () => {
    const c = leafCommunities(twoClusters, 8, opts);
    expect(c).toEqual([1, 1, 1, 0, 0, 0, 0, -1]);
  });

  it("gives the same result on every run", () => {
    const runs = Array.from({ length: 5 }, () => leafCommunities(twoClusters, 8, opts));
    for (const r of runs) expect(r).toEqual(runs[0]);
  });
});

describe("withParentCommunities", () => {
  it("takes the most common community among leaf descendants", () => {
    // 4 is the parent of 5 (a parent) and 0; 5 is the parent of 1, 2, 3.
    const leaf = [0, 1, 1, 2, -1, -1];
    const children = [[], [], [], [], [5, 0], [1, 2, 3]];
    const isLeaf = [true, true, true, true, false, false];
    expect(withParentCommunities(leaf, children, isLeaf)).toEqual([0, 1, 1, 2, 1, 1]);
  });

  it("is -1 for a parent whose leaves are all unclustered", () => {
    expect(withParentCommunities([-1, -1], [[], [0]], [true, false])).toEqual([-1, -1]);
  });
});

describe("describeCommunities", () => {
  it("names each community after its two largest leaf tags", () => {
    const nodes = [
      { label: "a", card_count: 5, is_leaf: true },
      { label: "b", card_count: 50, is_leaf: true },
      { label: "c", card_count: 20, is_leaf: true },
      { label: "parent", card_count: 999, is_leaf: false },
      { label: "d", card_count: 1, is_leaf: true },
    ];
    expect(describeCommunities([0, 0, 0, 0, 1], nodes)).toEqual([
      { id: 0, name: "b / c", size: 3 },
      { id: 1, name: "d", size: 1 },
    ]);
  });
});

describe("mulberry32", () => {
  it("is repeatable for a seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
