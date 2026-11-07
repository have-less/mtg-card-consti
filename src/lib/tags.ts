import { MISSING_WEIGHT, WEIGHT_LEVELS } from "../config.js";
import type { RawTag, RawTagging, CardTag } from "./types.js";

/** Turn a raw tagging weight (level name or number) into a number. */
export function taggingWeight(raw: RawTagging["weight"], levels = WEIGHT_LEVELS): number {
  if (raw === undefined || raw === null) return MISSING_WEIGHT;
  if (typeof raw === "number") return raw;
  const w = levels[raw.toLowerCase().replace(/[_\s-]/g, "")];
  if (w === undefined) throw new Error(`Unknown tagging weight "${raw}"; add it to WEIGHT_LEVELS in src/config.ts`);
  return w;
}

export interface TagIndex {
  tags: Map<string, RawTag>;
  /** oracle_id -> direct taggings on that card */
  cardTags: Map<string, CardTag[]>;
  /** tag_id -> child tag ids (merged from child_ids and children's parent_ids) */
  children: Map<string, Set<string>>;
}

/** Build lookup maps from raw tag objects. Non-oracle tags are skipped. */
export function indexTags(rawTags: Iterable<RawTag>): TagIndex {
  const tags = new Map<string, RawTag>();
  for (const t of rawTags) {
    if (t.type && t.type !== "oracle") continue;
    tags.set(t.id, t);
  }

  const children = new Map<string, Set<string>>();
  const addChild = (parent: string, child: string) => {
    if (!tags.has(parent) || !tags.has(child) || parent === child) return;
    let s = children.get(parent);
    if (!s) children.set(parent, (s = new Set()));
    s.add(child);
  };
  for (const t of tags.values()) {
    for (const c of t.child_ids ?? []) addChild(t.id, c);
    for (const p of t.parent_ids ?? []) addChild(p, t.id);
  }

  const cardTags = new Map<string, CardTag[]>();
  for (const t of tags.values()) {
    for (const tg of t.taggings ?? []) {
      let list = cardTags.get(tg.oracle_id);
      if (!list) cardTags.set(tg.oracle_id, (list = []));
      list.push({ id: t.id, weight: taggingWeight(tg.weight) });
    }
  }

  return { tags, cardTags, children };
}

export function isLeaf(index: TagIndex, tagId: string): boolean {
  return (index.children.get(tagId)?.size ?? 0) === 0;
}

/** Hierarchy edges as [parent, child] pairs, deduplicated. */
export function hierarchyPairs(index: TagIndex): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [parent, kids] of index.children) {
    for (const child of kids) out.push([parent, child]);
  }
  return out;
}

/**
 * For every tag, the set of oracle_ids tagged with it or any descendant.
 * Memoized per tag; cycles in the tag data are tolerated (a tag is never
 * walked twice in one descent).
 */
export function resolveTagCards(
  index: TagIndex,
  knownCards?: Set<string>,
): Map<string, Set<string>> {
  const direct = new Map<string, Set<string>>();
  for (const t of index.tags.values()) {
    const s = new Set<string>();
    for (const tg of t.taggings ?? []) {
      if (!knownCards || knownCards.has(tg.oracle_id)) s.add(tg.oracle_id);
    }
    direct.set(t.id, s);
  }

  const resolved = new Map<string, Set<string>>();
  const visit = (id: string, stack: Set<string>): Set<string> => {
    const done = resolved.get(id);
    if (done) return done;
    const result = new Set(direct.get(id));
    stack.add(id);
    for (const child of index.children.get(id) ?? []) {
      if (stack.has(child)) continue; // cycle guard
      for (const card of visit(child, stack)) result.add(card);
    }
    stack.delete(id);
    resolved.set(id, result);
    return result;
  };

  for (const id of index.tags.keys()) visit(id, new Set());
  return resolved;
}
