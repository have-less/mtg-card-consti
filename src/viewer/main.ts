import { DEFAULT_K, DEFAULT_SCORE } from "../config.js";
import { GraphRenderer } from "../graph/renderer.js";
import type { Card, GraphNode } from "../lib/types.js";
import { buildCardIndex, cardTagNodes, type CardIndex } from "./cardIndex.js";
import { CardPanel } from "./cardPanel.js";
import { CardPopup } from "./cardPopup.js";
import { colorNodes, type ColorMode } from "./colors.js";
import { loadCards, loadGraph } from "./data.js";
import { SearchBox } from "./searchBox.js";
import { adjacencyByScore, linkRows, pointRows, visibleEdges, type Filter } from "./viewData.js";

const status = document.getElementById("status")!;
const setStatus = (text: string) => (status.textContent = text);

async function main() {
  const graph = await loadGraph();
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const adjacency = adjacencyByScore(graph);
  const filter: Filter = { score: DEFAULT_SCORE, k: DEFAULT_K, min: 0, hierarchy: true };
  const colorMode: ColorMode = "community";

  const tFilter = performance.now();
  const visible = visibleEdges(graph, adjacency, filter);
  if (import.meta.env.DEV) console.log(`[viewer] visible edges: ${visible.length} in ${(performance.now() - tFilter).toFixed(1)} ms`);

  /** Cards with at least one tag; the rest have nothing to show on the graph. */
  let cards: Card[] | undefined;
  let cardIndex: CardIndex | undefined;
  let openTag: number | undefined;
  const closeAll = () => {
    openTag = undefined;
    popup.close();
    cardPanel.close();
    renderer.clearSelection();
  };
  const popup = new CardPopup(document.body, closeAll);

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
      loadCards()
        .then((loaded) => {
          cards = loaded.filter((c) => c.tags.length > 0);
          cardIndex = buildCardIndex(graph, loaded);
          if (openTag !== undefined) popup.setCards(cardIndex.cardsForTag(openTag));
          search.refresh();
        })
        .catch((e: Error) => setStatus(e.message));
    },
    onPointClick: (index, at) => openTagPopup(index, at),
    onBackgroundClick: () => (popup.isOpen || cardPanel.isOpen) && closeAll(),
  });

  const openTagPopup = (index: number, at?: { x: number; y: number }) => {
    cardPanel.close();
    openTag = index;
    popup.open(graph.nodes[index]!, cardIndex?.cardsForTag(index) ?? null, at);
  };

  const focusTag = (node: GraphNode) => {
    renderer.focusPoint(node.i);
    openTagPopup(node.i);
  };

  const cardPanel = new CardPanel(document.body, focusTag, closeAll);

  const focusCard = (card: Card) => {
    const tags = cardTagNodes(card, nodeById);
    popup.close();
    openTag = undefined;
    cardPanel.open(card, tags);
    if (tags.length) renderer.focusPoints(tags.map((n) => n.i));
  };

  const search = new SearchBox(document.body, graph.nodes, () => cards, { onTag: focusTag, onCard: focusCard });

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
    if (e.key === "Escape" && (popup.isOpen || cardPanel.isOpen)) closeAll();
  });
}

main().catch((e: Error) => {
  setStatus(e.message);
  console.error(e);
});
