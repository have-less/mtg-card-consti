import { describe, expect, it } from "vitest";
import { cosine, liftOverChance, npmi } from "../src/lib/scores.js";

describe("npmi", () => {
  it("matches hand-computed values", () => {
    // ln(10*2/(4*5)) = ln 1 = 0: exactly chance
    expect(npmi(2, 4, 5, 10)).toBeCloseTo(0, 10);
    // ln(10*4/(4*4)) / -ln(4/10) = ln 2.5 / ln 2.5 = 1: always together
    expect(npmi(4, 4, 4, 10)).toBeCloseTo(1, 10);
    // ln(8*2/(4*4)) / -ln(2/8): ln 1 = 0
    expect(npmi(2, 4, 4, 8)).toBeCloseTo(0, 10);
    // ln(8*2/(2*4)) / -ln(2/8) = ln 2 / ln 4 = 0.5
    expect(npmi(2, 2, 4, 8)).toBeCloseTo(0.5, 10);
    // below chance is negative
    expect(npmi(1, 4, 4, 8)).toBeLessThan(0);
  });

  it("is 1 when every card has both tags (n_ab == N)", () => {
    expect(npmi(5, 5, 5, 5)).toBe(1);
  });
});

describe("cosine and lift", () => {
  it("matches hand-computed values", () => {
    expect(cosine(2, 4, 4)).toBe(0.5);
    expect(cosine(3, 3, 12)).toBe(0.5);
    expect(liftOverChance(2, 2, 4, 8)).toBe(2);
  });
});
