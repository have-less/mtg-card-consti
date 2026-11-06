// Raw shapes from Scryfall bulk files (only the fields we read).

export interface RawTagging {
  oracle_id: string;
  /** A level name like "median" in the live file; numbers are accepted too. */
  weight?: number | string;
}

export interface RawTag {
  id: string;
  type?: string;
  label: string;
  slug?: string;
  category?: string | null;
  parent_ids?: string[];
  child_ids?: string[];
  taggings?: RawTagging[];
}

export interface RawCardFace {
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: { small?: string; normal?: string };
}

export interface RawCard {
  oracle_id?: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  set?: string;
  set_name?: string;
  rarity?: string;
  legalities?: Record<string, string>;
  image_uris?: { small?: string; normal?: string };
  card_faces?: RawCardFace[];
  scryfall_uri?: string;
}

// Output shapes written to data/out/.

export interface CardTag {
  id: string;
  weight: number;
}

export interface Card {
  oracle_id: string;
  name: string;
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text: string;
  colors: string[];
  color_identity: string[];
  color_identity_key: string;
  set: string;
  set_name: string;
  rarity: string;
  legalities: Record<string, string>;
  image_uris: { small?: string; normal?: string };
  scryfall_uri: string;
  tags: CardTag[];
}

/** Co-occurrence edge between two leaf tag ids, as computed in prep. */
export interface CooccurrenceEdge {
  source: string;
  target: string;
  type: "cooccurrence";
  count: number;
  score: number;
  npmi: number;
  cosine: number;
}

// graph.json. Edges point at nodes by array position.

export type DominantColor = "W" | "U" | "B" | "R" | "G" | "M" | "C";

export interface GraphNode {
  /** Equals the array position. */
  i: number;
  /** Scryfall tag UUID, the join key into cards.json. */
  id: string;
  label: string;
  slug: string;
  /** Size of the resolved card set (parents include descendants). */
  card_count: number;
  is_leaf: boolean;
  depth: number;
  /** Node index of the top-level ancestor; a root points to itself. */
  root_parent: number;
  /** -1 means unclustered. */
  community: number;
  dominant_color: DominantColor;
  degree_shipped: number;
}

export interface CoEdge {
  /** s < t */
  s: number;
  t: number;
  type: "co";
  count: number;
  score: number;
  npmi: number;
  cosine: number;
}

export interface HierEdge {
  /** Parent */
  s: number;
  /** Child */
  t: number;
  type: "h";
}

export type GraphEdge = CoEdge | HierEdge;

export interface GraphMeta {
  N: number;
  min_count: number;
  ship_k: number;
}

export interface Graph {
  generated_at: string;
  meta: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
