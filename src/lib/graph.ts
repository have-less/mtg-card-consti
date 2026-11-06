import { cooccurrenceEdges } from "./cooccurrence.js";
import { hierarchyPairs, isLeaf, resolveTagCards, type TagIndex } from "./tags.js";
import type { Card, Graph, GraphEdge, GraphNode } from "./types.js";

export function buildGraph(index: TagIndex, cards: Card[], minCount = 1, now = new Date()): Graph {
  const known = new Set(cards.map((c) => c.oracle_id));
  const resolved = resolveTagCards(index, known);
  const leaf = (id: string) => isLeaf(index, id);

  const nodes: GraphNode[] = [...index.tags.values()].map((t) => ({
    id: t.id,
    label: t.label,
    slug: t.slug ?? "",
    category: t.category ?? null,
    card_count: resolved.get(t.id)?.size ?? 0,
    is_leaf: leaf(t.id),
  }));

  const edges: GraphEdge[] = [
    ...hierarchyPairs(index).map(([source, target]) => ({ source, target, type: "hierarchy" as const })),
    ...cooccurrenceEdges(cards, leaf, minCount),
  ];

  return { generated_at: now.toISOString(), nodes, edges };
}
