import { describe, expect, it } from "vitest";
import { colorIdentityKey } from "../src/lib/colorKey.js";

describe("colorIdentityKey", () => {
  it("orders colors WUBRG", () => {
    expect(colorIdentityKey(["B", "U"])).toBe("UB");
    expect(colorIdentityKey(["G", "W", "R"])).toBe("WRG");
    expect(colorIdentityKey(["G", "R", "B", "U", "W"])).toBe("WUBRG");
  });
  it("maps colorless to C", () => {
    expect(colorIdentityKey([])).toBe("C");
    expect(colorIdentityKey(undefined)).toBe("C");
  });
  it("dedupes and ignores case", () => {
    expect(colorIdentityKey(["u", "U", "b"])).toBe("UB");
  });
  it("rejects unknown colors", () => {
    expect(() => colorIdentityKey(["X"])).toThrow();
  });
});
