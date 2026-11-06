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

export interface GraphNode {
  id: string;
  label: string;
  slug: string;
  category: string | null;
  card_count: number;
  is_leaf: boolean;
}

export interface CooccurrenceEdge {
  source: string;
  target: string;
  type: "cooccurrence";
  count: number;
  score: number;
}

export interface HierarchyEdge {
  source: string; // parent
  target: string; // child
  type: "hierarchy";
}

export type GraphEdge = CooccurrenceEdge | HierarchyEdge;

export interface Graph {
  generated_at: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
