import { DEFAULT_K, DEFAULT_SCORE } from "../config.js";
import { GraphRenderer } from "../graph/renderer.js";
import type { Graph } from "../lib/types.js";
import { colorNodes, type ColorMode } from "./colors.js";
import { adjacencyByScore, linkRows, pointRows, visibleEdges, type Filter } from "./viewData.js";

const GRAPH_URL = "/data/out/graph.json";

const status = document.getElementById("status")!;
const setStatus = (text: string) => (status.textContent = text);

async function main() {
  const res = await fetch(GRAPH_URL);
  if (!res.ok) throw new Error(`Could not load ${GRAPH_URL} (${res.status}). Run npm run prep first.`);
  const graph = (await res.json()) as Graph;

  const adjacency = adjacencyByScore(graph);
  const filter: Filter = { score: DEFAULT_SCORE, k: DEFAULT_K, min: 0, hierarchy: true };
  const colorMode: ColorMode = "community";

  const tFilter = performance.now();
  const visible = visibleEdges(graph, adjacency, filter);
  if (import.meta.env.DEV) console.log(`[viewer] visible edges: ${visible.length} in ${(performance.now() - tFilter).toFixed(1)} ms`);

  const { colors } = colorNodes(graph, colorMode);
  new GraphRenderer(document.getElementById("graph")!, {
    points: pointRows(graph, colors),
    links: linkRows(graph, visible),
    showClusterLabels: colorMode === "community",
    onRebuilt: ({ points, links }) => {
      const ms = performance.now(); // since page navigation started
      setStatus(`${points} tags, ${links} links${import.meta.env.DEV ? ` · drawn in ${ms.toFixed(0)} ms` : ""}`);
    },
  });
}

main().catch((e: Error) => {
  setStatus(e.message);
  console.error(e);
});
