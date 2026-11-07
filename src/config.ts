/**
 * Every tuning value for prep and the viewer lives here.
 */

/** Co-occurrence pairs sharing fewer cards than this are dropped. */
export const MIN_COUNT = 3;

/**
 * Ship an edge if it is in the top SHIP_K of either endpoint under any score.
 * Must be at least the largest edges-per-tag value the viewer allows.
 */
export const SHIP_K = 30;

/** Communities are found on each leaf tag's top COMMUNITY_K edges by npmi. */
export const COMMUNITY_K = 5;
export const COMMUNITY_RESOLUTION = 1;
/** Seed for Louvain's random source, so rebuilds give the same communities. */
export const COMMUNITY_SEED = 1;

/**
 * Scryfall's oracle_tags file stores tagging weight as a level name
 * ("median", "very_strong", ...). Keys are normalized: lowercase, no "_" or spaces.
 */
export const WEIGHT_LEVELS: Readonly<Record<string, number>> = {
  verystrong: 1.0,
  strong: 0.75,
  median: 0.5,
  weak: 0.25,
};

/** Weight for a tagging with no weight field at all. */
export const MISSING_WEIGHT = 1;

// Viewer

export const DEFAULT_SCORE = "npmi" as const;
/** Edges kept per tag in the live filter. Must not exceed SHIP_K. */
export const DEFAULT_K = 5;
export const MAX_K = 15;
/** Link pull and width for hierarchy links; co links use their npmi. */
export const HIER_STRENGTH = 0.05;
export const HIER_WIDTH = 0.05;

export const POINT_SIZE_RANGE: [number, number] = [2, 12];
export const LINK_WIDTH_RANGE: [number, number] = [0.5, 4];
export const LINK_STRENGTH_RANGE: [number, number] = [0.2, 1.0];
export const TOP_LABELS_LIMIT = 30;
export const DYNAMIC_LABELS_LIMIT = 30;
/** Opacity of unselected points while anything is selected. */
export const DIM_OPACITY = 0.15;

export const CO_LINK_COLOR = "rgba(160, 166, 178, 0.25)";
export const HIER_LINK_COLOR = "rgba(245, 166, 35, 0.6)";
export const OTHER_COLOR = "#8A8F98";
/** Categorical palette for the 12 largest communities or root tags, readable on a dark canvas. */
export const PALETTE_12 = [
  "#5DA5DA", "#FAA43A", "#60BD68", "#F17CB0", "#DECF3F", "#B276B2",
  "#F15854", "#4DD0E1", "#B2912F", "#A1D99B", "#FF8A65", "#9FA8DA",
];
export const COLOR_IDENTITY_COLORS: Readonly<Record<string, string>> = {
  W: "#E9E2C0",
  U: "#3B82C4",
  B: "#6F5F7A",
  R: "#D9483B",
  G: "#2E9E5B",
  M: "#D4AF37",
  C: "#9AA0A6",
};

/**
 * Force simulation. Unset values use the library defaults; the debug panel
 * edits these and can copy the chosen values back here.
 */
export const SIMULATION: {
  repulsion?: number;
  gravity?: number;
  linkSpring?: number;
  friction?: number;
  cluster: number;
} = {
  cluster: 0.3,
};
