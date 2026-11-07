import { DEFAULT_K, DEFAULT_SCORE } from "../config.js";
import { GraphRenderer } from "../graph/renderer.js";
import type { Card, Graph } from "../lib/types.js";
import { buildCardIndex, type CardIndex } from "./cardIndex.js";
import { CardPopup } from "./cardPopup.js";
import { colorNodes, type ColorMode } from "./colors.js";
import { TagSearch } from "./tagSearch.js";
import { adjacencyByScore, linkRows, pointRows, visibleEdges, type Filter } from "./viewData.js";

const GRAPH_URL = "/data/out/graph.json";
const CARDS_URL = "/data/out/cards.json";

const status = document.getElementById("status")!;
const setStatus = (text: string) => (status.textContent = text);

async function loadCards(graph: Graph): Promise<CardIndex> {
  const res = await fetch(CARDS_URL);
  if (!res.ok) throw new Error(`Could not load ${CARDS_URL} (${res.status})`);
  const { cards } = (await res.json()) as { cards: Card[] };
  return buildCardIndex(graph, cards);
}

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

  let cardIndex: CardIndex | undefined;
  let openTag: number | undefined;
  const closePopup = () => {
    openTag = undefined;
    popup.close();
    renderer.clearSelection();
  };
  const popup = new CardPopup(document.body, closePopup);

  const url = new URL(window.location.href);
  let dimensions: 2 | 3 = url.searchParams.get("view") === "3d" ? 3 : 2;

  const { colors } = colorNodes(graph, colorMode);
  let cardsRequested = false;
  const renderer = new GraphRenderer(document.getElementById("graph")!, {
    points: pointRows(graph, colors),
    links: linkRows(graph, visible),
    showClusterLabels: colorMode === "community",
    dimensions,
    onRebuilt: ({ points, links }) => {
      const ms = performance.now(); // since page navigation started
      setStatus(`${points} tags, ${links} links${import.meta.env.DEV ? ` · drawn in ${ms.toFixed(0)} ms` : ""}`);
      if (cardsRequested) return;
      cardsRequested = true;
      loadCards(graph)
        .then((index) => {
          cardIndex = index;
          if (openTag !== undefined) popup.setCards(index.cardsForTag(openTag));
        })
        .catch((e: Error) => setStatus(e.message));
    },
    onPointClick: (index, at) => openPopup(index, at),
    onBackgroundClick: () => popup.isOpen && closePopup(),
  });

  const openPopup = (index: number, at?: { x: number; y: number }) => {
    openTag = index;
    popup.open(graph.nodes[index]!, cardIndex?.cardsForTag(index) ?? null, at);
  };

  new TagSearch(document.body, graph.nodes, (node) => {
    renderer.focusPoint(node.i);
    openPopup(node.i);
  });

  const viewToggle = document.createElement("button");
  viewToggle.className = "view-toggle";
  const labelToggle = () => {
    viewToggle.textContent = dimensions === 3 ? "2D" : "3D";
    viewToggle.title = dimensions === 3 ? "Switch to the flat view" : "Switch to 3D (drag to rotate, scroll to zoom, Shift-drag to pan)";
  };
  labelToggle();
  viewToggle.addEventListener("click", () => {
    dimensions = dimensions === 3 ? 2 : 3;
    labelToggle();
    if (dimensions === 3) url.searchParams.set("view", "3d");
    else url.searchParams.delete("view");
    history.replaceState(null, "", url);
    void renderer.setDimensions(dimensions);
  });
  document.body.append(viewToggle);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popup.isOpen) closePopup();
  });
}

main().catch((e: Error) => {
  setStatus(e.message);
  console.error(e);
});
