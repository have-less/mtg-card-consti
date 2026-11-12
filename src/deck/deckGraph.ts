import { COLOR_IDENTITY_COLORS, DECK_CARD_LINK_COLOR, OTHER_COLOR } from "../config.js";
import { colorBucket } from "../lib/nodeFields.js";
import type { Card, Graph, GraphNode } from "../lib/types.js";
import { buildCardIndex, cardTagNodes, type TagCard } from "../viewer/cardIndex.js";
import { clusterName, linkRows, type LinkRow, type PointRow } from "../viewer/viewData.js";

export interface DeckTag {
  node: GraphNode;
  /** The deck's cards with this tag or a descendant, strongest weight first. */
  cards: TagCard[];
}

export interface Rows {
  points: PointRow[];
  links: LinkRow[];
}

/** Every tag directly on a deck card, most deck cards first, then by label. */
export function deckTags(graph: Pick<Graph, "nodes" | "edges">, deck: readonly Card[]): DeckTag[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const present = new Set(deck.flatMap((card) => cardTagNodes(card, nodeById)));
  const index = buildCardIndex(graph, deck);
  return [...present]
    .map((node) => ({ node, cards: index.cardsForTag(node.i) }))
    .sort((a, b) => b.cards.length - a.cards.length || a.node.label.localeCompare(b.node.label));
}

/**
 * Tag view: the given tags as points, sized by deck card count, with every shipped
 * graph edge between two of them. Point idx is the position in `tags`.
 */
export function deckTagRows(
  graph: Pick<Graph, "nodes" | "edges" | "meta">,
  tags: readonly DeckTag[],
  colors: readonly string[],
): Rows {
  const pointOf = new Map(tags.map((t, k) => [t.node.i, k]));
  const points = tags.map(({ node, cards }, k) => ({
    id: node.id,
    idx: k,
    label: node.label,
    card_count: cards.length,
    size: cards.length,
    cluster: clusterName(graph.meta, node),
    color: colors[node.i] ?? OTHER_COLOR,
  }));
  const edges = graph.edges.flatMap((e, i) => (pointOf.has(e.s) && pointOf.has(e.t) ? [i] : []));
  return { points, links: linkRows(graph, edges, (node) => pointOf.get(node)!) };
}

export interface CardLink {
  /** Indexes into the deck, a < b. */
  a: number;
  b: number;
  /** Tags the two cards both have. */
  shared: number;
}

/** Links between cards sharing tags (other than `ignore`): the union of each card's top k by shared count. */
export function cardLinks(deck: readonly Card[], k: number, ignore: ReadonlySet<string> = new Set()): CardLink[] {
  const tagSets = deck.map((c) => new Set(c.tags.map((t) => t.id).filter((id) => !ignore.has(id))));
  const all: CardLink[] = [];
  const byCard: CardLink[][] = deck.map(() => []);
  for (let a = 0; a < deck.length; a++) {
    for (let b = a + 1; b < deck.length; b++) {
      let shared = 0;
      for (const id of tagSets[a]!) if (tagSets[b]!.has(id)) shared++;
      if (shared === 0) continue;
      const link = { a, b, shared };
      all.push(link);
      byCard[a]!.push(link);
      byCard[b]!.push(link);
    }
  }
  const order = (x: CardLink, y: CardLink) => y.shared - x.shared || x.a - y.a || x.b - y.b;
  const keep = new Set<CardLink>();
  for (const links of byCard) for (const l of links.sort(order).slice(0, k)) keep.add(l);
  return all.filter((l) => keep.has(l));
}

/** Card view: deck cards as points, sized by how many links they kept, colored by color identity. */
export function deckCardRows(deck: readonly Card[], links: readonly CardLink[]): Rows {
  const degree = deck.map(() => 0);
  for (const l of links) {
    degree[l.a]!++;
    degree[l.b]!++;
  }
  const maxShared = Math.max(1, ...links.map((l) => l.shared));
  return {
    points: deck.map((c, i) => ({
      id: c.oracle_id,
      idx: i,
      label: c.name,
      card_count: degree[i]!,
      size: 1 + degree[i]!,
      cluster: null,
      color: COLOR_IDENTITY_COLORS[colorBucket(c.color_identity_key)] ?? OTHER_COLOR,
    })),
    links: links.map((l, i) => ({
      source: deck[l.a]!.oracle_id,
      target: deck[l.b]!.oracle_id,
      sourceidx: l.a,
      targetidx: l.b,
      edge: i,
      kind: "co",
      strength: l.shared / maxShared,
      width: l.shared / maxShared,
      color: DECK_CARD_LINK_COLOR,
    })),
  };
}
