import type { Card } from "../lib/types.js";

/** Section headings that exporters (Arena, MTGO, Moxfield, Archidekt) put between cards. */
const HEADINGS = new Set([
  "about", "commander", "commanders", "companion", "deck", "main", "maindeck", "main deck", "mainboard",
  "sideboard", "maybeboard", "considering", "tokens",
]);

/** Lowercase, plain ASCII letters, straight quotes, single spaces, and " // " between faces. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s*\/{1,2}\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Card names from a pasted deck list, in order, each once. Accepts "1 Name",
 * "1x Name", bare names, Arena/Moxfield set and collector suffixes, Archidekt
 * [categories], comments and section headings.
 */
export function parseDeckList(text: string): string[] {
  const names = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim().replace(/^SB:\s*/i, "");
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    const counted = /^(\d+)\s*x?\s+(.+)$/i.exec(line);
    if (counted) line = counted[2]!;
    else if (line.endsWith(":") || /^[^()]+\(\d+\)$/.test(line) || HEADINGS.has(line.toLowerCase())) continue;
    line = line
      .replace(/\s*\^[^^]*\^/g, "")
      .replace(/\s*\[[^\]]*\]/g, "")
      .replace(/(\s+\*[A-Z]+\*)+$/, "")
      .replace(/\s+\([A-Za-z0-9]{2,6}\)(\s+\S+)?$/, "")
      .trim();
    const key = normalizeName(line);
    if (key && !names.has(key)) names.set(key, line);
  }
  return [...names.values()];
}

/** A land by its front face, so a spell with a land back face stays a spell. */
export function isLand(card: Pick<Card, "type_line">): boolean {
  return /\bLand\b/.test(card.type_line.split(" // ")[0]!);
}

export interface DeckMatch {
  /** Matched cards in list order, each once. */
  cards: Card[];
  /** Names that matched no card. */
  missing: string[];
}

/** Match names to cards by full name, or by any one face of a multi-face card. */
export function matchDeck(names: readonly string[], cards: readonly Card[]): DeckMatch {
  const byName = new Map<string, Card>();
  for (const c of cards) byName.set(normalizeName(c.name), c);
  for (const c of cards) {
    for (const face of normalizeName(c.name).split(" // ")) if (!byName.has(face)) byName.set(face, c);
  }
  const found = new Set<Card>();
  const missing: string[] = [];
  for (const name of names) {
    const card = byName.get(normalizeName(name));
    if (card) found.add(card);
    else missing.push(name);
  }
  return { cards: [...found], missing };
}
