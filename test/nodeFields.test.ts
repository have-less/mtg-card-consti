import { describe, expect, it } from "vitest";
import { dominantColor, rootParents } from "../src/lib/nodeFields.js";

describe("rootParents", () => {
  it("points a root at itself with depth 0", () => {
    expect(rootParents([[], [0]], [10, 5])).toEqual({ root: [0, 0], depth: [0, 1] });
  });

  it("picks the root with the largest card count when a tag has several parents", () => {
    // 3 has parents 1 and 2. 1 sits under root 0 (100 cards); 2 is a root (50 cards).
    const parents = [[], [0], [], [1, 2]];
    const { root, depth } = rootParents(parents, [100, 60, 50, 5]);
    expect(root[3]).toBe(0);
    expect(depth[3]).toBe(2);
  });

  it("breaks card count ties by the nearer root", () => {
    const parents = [[], [0], [], [1, 2]];
    const { root, depth } = rootParents(parents, [50, 40, 50, 5]);
    expect(root[3]).toBe(2);
    expect(depth[3]).toBe(1);
  });

  it("treats a node in a rootless cycle as its own root", () => {
    expect(rootParents([[1], [0]], [1, 1])).toEqual({ root: [0, 1], depth: [0, 0] });
  });
});

describe("dominantColor", () => {
  it("buckets mono, multicolor and colorless cards", () => {
    expect(dominantColor(["B", "B", "UB"])).toBe("B");
    expect(dominantColor(["UB", "WUBRG", "R"])).toBe("M");
    expect(dominantColor(["C", "C", "G"])).toBe("C");
  });

  it("calls a tie for most common M and defaults to C", () => {
    expect(dominantColor(["W", "U", "B", "R", "G"])).toBe("M");
    expect(dominantColor(["G", "W", "G", "W", "C"])).toBe("M");
    expect(dominantColor(["C", "C", "W"])).toBe("C");
    expect(dominantColor([])).toBe("C");
  });
});
