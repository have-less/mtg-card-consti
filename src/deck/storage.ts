const KEYS = {
  text: "mtg-tag-graph:deck",
  hiddenTags: "mtg-tag-graph:deck-hidden-tags",
  hideLands: "mtg-tag-graph:deck-hide-lands",
};

/** A saved JSON list of ids. Anything unreadable becomes an empty set. */
export function parseIdList(raw: string | null): Set<string> {
  try {
    const ids: unknown = JSON.parse(raw ?? "[]");
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

/** The deck page's settings, kept in localStorage between visits. */
export const deckStorage = {
  text: (): string => localStorage.getItem(KEYS.text) ?? "",
  setText: (text: string) => localStorage.setItem(KEYS.text, text),
  hiddenTags: (): Set<string> => parseIdList(localStorage.getItem(KEYS.hiddenTags)),
  setHiddenTags: (ids: ReadonlySet<string>) => localStorage.setItem(KEYS.hiddenTags, JSON.stringify([...ids])),
  hideLands: (): boolean => localStorage.getItem(KEYS.hideLands) === "1",
  setHideLands: (hide: boolean) => localStorage.setItem(KEYS.hideLands, hide ? "1" : "0"),
};
