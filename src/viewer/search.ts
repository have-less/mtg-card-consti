import type { GraphNode } from "../lib/types.js";
import type { TagCard } from "./cardIndex.js";

const norm = (s: string) => s.toLowerCase().replace(/[-_]+/g, " ").trim();

/**
 * Tags whose label or slug contains the query. Prefix matches rank above
 * other substring matches; within each, larger tags come first.
 */
export function searchTags(nodes: readonly GraphNode[], query: string, limit = 10): GraphNode[] {
  const q = norm(query);
  if (!q) return [];
  const prefix: GraphNode[] = [];
  const inner: GraphNode[] = [];
  for (const n of nodes) {
    const label = norm(n.label);
    const slug = norm(n.slug);
    if (label.startsWith(q) || slug.startsWith(q)) prefix.push(n);
    else if (label.includes(q) || slug.includes(q)) inner.push(n);
  }
  const bySize = (a: GraphNode, b: GraphNode) => b.card_count - a.card_count || a.i - b.i;
  return [...prefix.sort(bySize), ...inner.sort(bySize)].slice(0, limit);
}

/** Lowercase with accents removed, so "altair" finds "Altaïr". */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Cards whose name contains the query, ignoring case and accents. An exact
 * name ranks first, then names starting with the query, then the rest;
 * alphabetical within each.
 */
export function searchCards<C extends { name: string }>(cards: readonly C[], query: string, limit = 8): C[] {
  const q = fold(query);
  if (!q) return [];
  const ranked: [number, C][] = [];
  for (const c of cards) {
    const name = fold(c.name);
    const at = name.indexOf(q);
    if (at < 0) continue;
    const faceStart = name.split(" // ").some((face) => face.startsWith(q));
    ranked.push([name === q ? 0 : faceStart ? 1 : 2, c]);
  }
  return ranked
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, c]) => c);
}

/** Cards whose name, type line or rules text contain every word of the query. Order is kept. */
export function filterCards(cards: readonly TagCard[], query: string): TagCard[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...cards];
  return cards.filter(({ card }) => {
    const text = `${card.name}\n${card.type_line}\n${card.oracle_text}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
