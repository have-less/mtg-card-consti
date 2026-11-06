const WUBRG = ["W", "U", "B", "R", "G"] as const;

/**
 * Turn a color_identity array into a stable key in Scryfall's WUBRG order.
 * ["B","U"] -> "UB", [] -> "C" (colorless).
 */
export function colorIdentityKey(colors: readonly string[] | undefined): string {
  if (!colors || colors.length === 0) return "C";
  const set = new Set(colors.map((c) => c.toUpperCase()));
  for (const c of set) {
    if (!(WUBRG as readonly string[]).includes(c)) {
      throw new Error(`Unknown color in color_identity: ${c}`);
    }
  }
  return WUBRG.filter((c) => set.has(c)).join("");
}
