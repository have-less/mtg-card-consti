import { colorIdentityKey } from "./colorKey.js";
import type { Card, CardTag, RawCard } from "./types.js";

/** Keep the fields the viewer needs; fall back to card faces for split/DFC cards. */
export function toCard(raw: RawCard, tags: CardTag[]): Card | null {
  if (!raw.oracle_id) return null; // e.g. reversible cards without a top-level oracle_id
  const faces = raw.card_faces ?? [];
  const joinFaces = (k: "mana_cost" | "type_line" | "oracle_text") =>
    faces.map((f) => f[k] ?? "").filter(Boolean).join(" // ");
  const image = raw.image_uris ?? faces[0]?.image_uris ?? {};
  const ci = raw.color_identity ?? [];
  return {
    oracle_id: raw.oracle_id,
    name: raw.name,
    mana_cost: raw.mana_cost ?? joinFaces("mana_cost"),
    cmc: raw.cmc ?? 0,
    type_line: raw.type_line ?? joinFaces("type_line"),
    oracle_text: raw.oracle_text ?? joinFaces("oracle_text"),
    colors: raw.colors ?? [],
    color_identity: ci,
    color_identity_key: colorIdentityKey(ci),
    set: raw.set ?? "",
    set_name: raw.set_name ?? "",
    rarity: raw.rarity ?? "",
    legalities: raw.legalities ?? {},
    image_uris: { small: image.small, normal: image.normal },
    scryfall_uri: raw.scryfall_uri ?? "",
    tags,
  };
}
