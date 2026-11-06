/**
 * npm run prep [-- --offline] [--force] [--raw-dir data/raw] [--out-dir data/out] [--min-count 3]
 *
 * Downloads Scryfall's oracle_cards and oracle_tags bulk files (once per day),
 * joins them, and writes data/out/graph.json and data/out/cards.json.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { COMMUNITY_K, MIN_COUNT } from "./config.js";
import { toCard } from "./lib/cards.js";
import { buildAdjacency, topKEdges } from "./lib/edgeRank.js";
import { buildGraph } from "./lib/graph.js";
import { readJsonl } from "./lib/jsonl.js";
import { BULK_TYPES, downloadTo, fetchBulkMetadata, type BulkType } from "./lib/scryfall.js";
import { indexTags } from "./lib/tags.js";
import type { Card, CoEdge, RawCard, RawTag } from "./lib/types.js";

const { values: args } = parseArgs({
  options: {
    offline: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    "raw-dir": { type: "string", default: "data/raw" },
    "out-dir": { type: "string", default: "data/out" },
    "min-count": { type: "string", default: process.env.PREP_MIN_COUNT ?? String(MIN_COUNT) },
  },
});
const rawDir = args["raw-dir"]!;
const outDir = args["out-dir"]!;
const minCount = Number(args["min-count"]);
if (!Number.isInteger(minCount) || minCount < 1) throw new Error("--min-count must be a whole number >= 1");

const log = (msg: string) => console.log(`[prep] ${msg}`);
const today = new Date().toISOString().slice(0, 10);

async function latestRawFile(type: BulkType): Promise<string> {
  const files = existsSync(rawDir) ? await readdir(rawDir) : [];
  const match = files.filter((f) => f.startsWith(`${type}-`) && /\.jsonl(\.gz)?$/.test(f)).sort();
  const last = match.at(-1);
  if (!last) throw new Error(`No ${type} file in ${rawDir}. Run without --offline to download.`);
  return join(rawDir, last);
}

async function ensureRawFiles(): Promise<Record<BulkType, string>> {
  const paths = {} as Record<BulkType, string>;
  if (args.offline) {
    for (const t of BULK_TYPES) paths[t] = await latestRawFile(t);
    return paths;
  }
  const meta = await fetchBulkMetadata();
  for (const t of BULK_TYPES) {
    const path = join(rawDir, `${t}-${today}.jsonl.gz`);
    if (existsSync(path) && !args.force) {
      log(`${t}: using existing ${path}`);
    } else {
      log(`${t}: downloading ${meta[t].jsonl_download_uri}`);
      await downloadTo(meta[t].jsonl_download_uri, path);
    }
    paths[t] = path;
  }
  return paths;
}

function percentiles(values: number[], ps = [50, 90, 99, 100]): string {
  if (values.length === 0) return "n/a";
  const sorted = [...values].sort((a, b) => a - b);
  return ps
    .map((p) => {
      const v = sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
      return `${p === 0 ? "min" : p === 100 ? "max" : `p${p}`}=${v}`;
    })
    .join(" ");
}

async function main() {
  const started = Date.now();
  const raw = await ensureRawFiles();

  log(`reading tags from ${raw.oracle_tags}`);
  const rawTags: RawTag[] = [];
  const weightLevels = new Map<string, number>();
  for await (const t of readJsonl<RawTag>(raw.oracle_tags)) {
    rawTags.push(t);
    for (const tg of t.taggings ?? []) {
      const w = JSON.stringify(tg.weight ?? null);
      weightLevels.set(w, (weightLevels.get(w) ?? 0) + 1);
    }
  }
  const index = indexTags(rawTags);

  log(`reading cards from ${raw.oracle_cards}`);
  const cards: Card[] = [];
  let skipped = 0;
  for await (const rc of readJsonl<RawCard>(raw.oracle_cards)) {
    const card = toCard(rc, rc.oracle_id ? (index.cardTags.get(rc.oracle_id) ?? []) : []);
    if (card) cards.push(card);
    else skipped++;
  }

  const { graph, stats } = buildGraph(index, cards, { minCount });

  await mkdir(outDir, { recursive: true });
  const graphPath = join(outDir, "graph.json");
  const cardsPath = join(outDir, "cards.json");
  await writeFile(graphPath, JSON.stringify(graph));
  await writeFile(cardsPath, JSON.stringify({ generated_at: graph.generated_at, cards }));

  // Stats report: the numbers we need to tune pruning.
  const co = graph.edges.filter((e): e is CoEdge => e.type === "co");
  const leaves = graph.nodes.filter((n) => n.is_leaf);
  const taggedCards = cards.filter((c) => c.tags.length > 0).length;
  const mb = async (p: string) => ((await stat(p)).size / 1e6).toFixed(1);
  const spread = [0, 25, 50, 75, 100];
  const edgeList = graph.edges;
  const defaultView = topKEdges(buildAdjacency(edgeList, graph.nodes.length, "npmi"), edgeList, "npmi", COMMUNITY_K);
  const viewDegree = new Map<number, number>();
  for (const i of defaultView) {
    const e = edgeList[i]!;
    for (const v of [e.s, e.t]) viewDegree.set(v, (viewDegree.get(v) ?? 0) + 1);
  }
  const [busiestNode, busiestDeg] = [...viewDegree].sort((a, b) => b[1] - a[1])[0] ?? [-1, 0];
  const busiest =
    busiestNode < 0
      ? "n/a"
      : `"${graph.nodes[busiestNode]!.label}" on ${busiestDeg} (${((100 * busiestDeg) / defaultView.size).toFixed(1)}%)`;
  console.log(`
=== prep summary ===
tags:              ${graph.nodes.length} (${leaves.length} leaf, ${graph.nodes.length - leaves.length} parent)
tags with 0 cards: ${graph.nodes.filter((n) => n.card_count === 0).length}
cards:             ${cards.length} (${taggedCards} with at least one tag, N=${graph.meta.N} with a leaf tag, ${skipped} skipped without oracle_id)
tagging weights:   ${[...weightLevels].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}=${n}`).join(" ")}
hierarchy edges:   ${graph.edges.length - co.length}
co-occur pairs:    ${stats.pairsBeforeFilter} sharing any card
  count>=${minCount}:        ${stats.pairsAfterMinCount}
  and npmi>0:      ${stats.scoredEdges.length}
  shipped:         ${co.length} (top ${graph.meta.ship_k} per tag under any score)
  npmi, all:       ${percentiles(stats.scoredEdges.map((e) => e.npmi), spread)}
  npmi, shipped:   ${percentiles(co.map((e) => e.npmi), spread)}
  count, shipped:  ${percentiles(co.map((e) => e.count), spread)}
  leaves w/ edges: ${leaves.filter((n) => n.degree_shipped > 0).length} of ${leaves.length}
default view:      ${defaultView.size} edges (npmi, top ${COMMUNITY_K} per tag); busiest tag ${busiest}
communities:       ${graph.meta.community_count} (${leaves.filter((n) => n.community < 0).length} leaf tags unclustered)
  10 largest:      ${graph.meta.communities.slice(0, 10).map((c) => `${c.size} "${c.name}"`).join(", ")}
graph.json:        ${await mb(graphPath)} MB
cards.json:        ${await mb(cardsPath)} MB
took:              ${((Date.now() - started) / 1000).toFixed(1)}s
`);
}

main().catch((e) => {
  console.error(`[prep] FAILED: ${(e as Error).message}`);
  process.exit(1);
});
