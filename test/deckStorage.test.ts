import { describe, expect, it } from "vitest";
import { parseIdList } from "../src/deck/storage.js";

describe("parseIdList", () => {
  it("reads a JSON list of ids, dropping non-strings", () => {
    expect(parseIdList('["a","b",3,null,"a"]')).toEqual(new Set(["a", "b"]));
  });

  it("treats missing, malformed or non-list values as empty", () => {
    expect(parseIdList(null)).toEqual(new Set());
    expect(parseIdList("{not json")).toEqual(new Set());
    expect(parseIdList('{"a":1}')).toEqual(new Set());
  });
});
