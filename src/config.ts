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
