import type { Card, Graph, GraphNode } from "../lib/types.js";

/** A card's tags as graph nodes, each once, most cards first. Tags not in the graph are skipped. */
export function cardTagNodes(card: Pick<Card, "tags">, nodeById: ReadonlyMap<string, GraphNode>): GraphNode[] {
  const nodes = new Set<GraphNode>();
  for (const t of card.tags) {
    const n = nodeById.get(t.id);
    if (n) nodes.add(n);
  }
  return [...nodes].sort((a, b) => b.card_count - a.card_count);
}

export interface TagCard {
  card: Card;
  /** Highest tagging weight of this card among the tag and its descendants. */
  weight: number;
}

export interface CardIndex {
  /** A tag's resolved cards (its own plus every descendant's), strongest weight first, then by name. */
  cardsForTag(nodeIndex: number): TagCard[];
}

export function buildCardIndex(graph: Pick<Graph, "nodes" | "edges">, cards: readonly Card[]): CardIndex {
  const pos = new Map(graph.nodes.map((n) => [n.id, n.i]));
  const direct: Map<Card, number>[] = graph.nodes.map(() => new Map());
  for (const card of cards) {
    for (const t of card.tags) {
      const i = pos.get(t.id);
      if (i === undefined) continue;
      const m = direct[i]!;
      m.set(card, Math.max(m.get(card) ?? 0, t.weight));
    }
  }

  const children: number[][] = graph.nodes.map(() => []);
  for (const e of graph.edges) if (e.type === "h") children[e.s]!.push(e.t);

  const cache = new Map<number, TagCard[]>();
  return {
    cardsForTag(nodeIndex) {
      const hit = cache.get(nodeIndex);
      if (hit) return hit;
      const merged = new Map<Card, number>();
      const seen = new Set<number>();
      const stack = [nodeIndex];
      while (stack.length) {
        const v = stack.pop()!;
        if (seen.has(v)) continue;
        seen.add(v);
        for (const [card, w] of direct[v] ?? []) merged.set(card, Math.max(merged.get(card) ?? 0, w));
        stack.push(...(children[v] ?? []));
      }
      const list = [...merged]
        .map(([card, weight]) => ({ card, weight }))
        .sort((a, b) => b.weight - a.weight || a.card.name.localeCompare(b.card.name));
      cache.set(nodeIndex, list);
      return list;
    },
  };
}
