import { createWriteStream } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const HEADERS = {
  "User-Agent": "mtg-tag-graph/0.1 (personal tag graph prototype)",
  Accept: "application/json",
};

export const BULK_TYPES = ["oracle_cards", "oracle_tags"] as const;
export type BulkType = (typeof BULK_TYPES)[number];

export interface BulkEntry {
  type: BulkType;
  jsonl_download_uri: string;
  size?: number;
  updated_at?: string;
}

export async function fetchBulkMetadata(): Promise<Record<BulkType, BulkEntry>> {
  const res = await fetch("https://api.scryfall.com/bulk-data", { headers: HEADERS });
  if (!res.ok) throw new Error(`Scryfall /bulk-data returned ${res.status}`);
  const body = (await res.json()) as { data?: Array<Record<string, unknown>> };
  const out: Partial<Record<BulkType, BulkEntry>> = {};
  for (const type of BULK_TYPES) {
    const entry = body.data?.find((d) => d.type === type);
    if (!entry) throw new Error(`Scryfall bulk data has no "${type}" entry`);
    if (typeof entry.jsonl_download_uri !== "string") {
      throw new Error(`"${type}" has no jsonl_download_uri; Scryfall's format may have changed`);
    }
    out[type] = entry as unknown as BulkEntry;
  }
  return out as Record<BulkType, BulkEntry>;
}

/** Stream a download to disk (via a .part file so a crash never leaves a half file). */
export async function downloadTo(url: string, path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"] } });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}): ${url}`);
  const tmp = `${path}.part`;
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp));
  await rename(tmp, path);
}
