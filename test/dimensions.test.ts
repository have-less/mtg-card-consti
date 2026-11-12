import { describe, expect, it } from "vitest";
import { dimensionsFromUrl, setDimensionsInUrl } from "../src/viewer/dimensions.js";

describe("dimensions in the URL", () => {
  it("reads ?view=3d as 3D and anything else as flat", () => {
    expect(dimensionsFromUrl(new URL("http://x/?view=3d"))).toBe(3);
    expect(dimensionsFromUrl(new URL("http://x/?view=2d"))).toBe(2);
    expect(dimensionsFromUrl(new URL("http://x/"))).toBe(2);
  });

  it("writes 3D as ?view=3d and drops the param for flat, keeping others", () => {
    const url = new URL("http://x/deck?show=cards");
    setDimensionsInUrl(url, 3);
    expect(url.search).toBe("?show=cards&view=3d");
    setDimensionsInUrl(url, 2);
    expect(url.search).toBe("?show=cards");
  });
});
