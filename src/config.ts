/**
 * Every tuning value for prep and the viewer lives here.
 */

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
