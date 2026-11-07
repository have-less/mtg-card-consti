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

/** Cards whose name, type line or rules text contain every word of the query. Order is kept. */
export function filterCards(cards: readonly TagCard[], query: string): TagCard[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...cards];
  return cards.filter(({ card }) => {
    const text = `${card.name}\n${card.type_line}\n${card.oracle_text}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
