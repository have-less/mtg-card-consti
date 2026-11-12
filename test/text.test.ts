import { describe, expect, it } from "vitest";
import { fold } from "../src/lib/text.js";

describe("fold", () => {
  it("lowercases, strips accents and trims", () => {
    expect(fold("  Lim-Dûl's Vault ")).toBe("lim-dul's vault");
    expect(fold("Altaïr Ibn-La'Ahad")).toBe("altair ibn-la'ahad");
  });
});
