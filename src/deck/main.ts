import { DECK_CARD_K, DECK_MIN_TAG_CARDS } from "../config.js";
import { GraphRenderer } from "../graph/renderer.js";
import type { Card, GraphNode } from "../lib/types.js";
import { CardPanel } from "../viewer/cardPanel.js";
import { CardPopup } from "../viewer/cardPopup.js";
import { colorNodes } from "../viewer/colors.js";
import { loadCards, loadGraph } from "../viewer/data.js";
import { cardLinks, deckCardRows, deckTagRows, deckTags, type DeckTag, type Rows } from "./deckGraph.js";
import { matchDeck, parseDeckList } from "./deckList.js";
import { DeckPanel, type DeckView } from "./deckPanel.js";

const STORAGE_KEY = "mtg-tag-graph:deck";
const HIDDEN_KEY = "mtg-tag-graph:deck-hidden-tags";

function loadHidden(): Set<string> {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]");
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

const status = document.getElementById("status")!;
const setStatus = (text: string) => (status.textContent = text);

async function main() {
  const graph = await loadGraph();
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const { colors } = colorNodes(graph, "community");

  const url = new URL(window.location.href);
  let view: DeckView = url.searchParams.get("view") === "cards" ? "cards" : "tags";
  let dimensions: 2 | 3 = url.searchParams.get("dim") === "3d" ? 3 : 2;
  let minCards = DECK_MIN_TAG_CARDS;
  const hidden = loadHidden();
  let cards: Card[] | undefined;
  let deck: Card[] = [];
  let tags: DeckTag[] = [];
  /** Tags drawn in the tag view; point index k is shown[k]. */
  let shown: DeckTag[] = [];
  let renderer: GraphRenderer | undefined;

  const closeAll = () => {
    popup.close();
    cardPanel.close();
    renderer?.clearSelection();
  };
  const popup = new CardPopup(document.body, closeAll);

  const syncUrl = () => {
    if (view === "cards") url.searchParams.set("view", "cards");
    else url.searchParams.delete("view");
    if (dimensions === 3) url.searchParams.set("dim", "3d");
    else url.searchParams.delete("dim");
    history.replaceState(null, "", url);
  };

  const rows = (): Rows => {
    if (view === "cards") return deckCardRows(deck, cardLinks(deck, DECK_CARD_K, hidden));
    shown = tags.filter((t) => t.cards.length >= minCards && !hidden.has(t.node.id));
    return deckTagRows(graph, shown, colors);
  };

  const draw = async () => {
    closeAll();
    if (deck.length === 0) return;
    const { points, links } = rows();
    if (renderer) return renderer.setData(points, links, view === "tags");
    renderer = new GraphRenderer(document.getElementById("graph")!, {
      points,
      links,
      showClusterLabels: view === "tags",
      dimensions,
      onRebuilt: ({ points, links }) =>
        setStatus(`${points} ${view === "tags" ? "tags" : "cards"}, ${links} links`),
      onPointClick: (index, at) => {
        if (view === "tags") {
          cardPanel.close();
          const t = shown[index]!;
          popup.open(t.node, t.cards, at);
        } else {
          openCard(deck[index]!);
        }
      },
      onBackgroundClick: () => (popup.isOpen || cardPanel.isOpen) && closeAll(),
    });
  };

  const openCard = (card: Card) => {
    popup.close();
    const cardTags = [...new Set(card.tags.map((t) => nodeById.get(t.id)).filter((n): n is GraphNode => !!n))].sort(
      (a, b) => b.card_count - a.card_count,
    );
    cardPanel.open(card, cardTags);
  };

  /** From a tag in the card panel: show it in the tag view with its deck cards. */
  const focusTag = async (node: GraphNode) => {
    const deckTag = tags.find((t) => t.node.i === node.i);
    if (view !== "tags") {
      view = "tags";
      panel.setView(view);
      syncUrl();
      await draw();
    }
    cardPanel.close();
    const k = shown.findIndex((t) => t.node.i === node.i);
    if (k >= 0) renderer?.focusPoint(k);
    popup.open(node, deckTag?.cards ?? []);
  };
  const cardPanel = new CardPanel(document.body, (node) => void focusTag(node), closeAll);

  const map = (text: string) => {
    if (!cards) return;
    localStorage.setItem(STORAGE_KEY, text);
    const names = parseDeckList(text);
    const match = matchDeck(names, cards);
    deck = match.cards;
    tags = deckTags(graph, deck);
    panel.showResult(deck.length, names.length, tags, match.missing);
    if (deck.length === 0) setStatus("");
    void draw();
  };

  const panel = new DeckPanel(document.body, {
    text: localStorage.getItem(STORAGE_KEY) ?? "",
    view,
    minCards,
    dimensions,
    hidden,
    onMap: map,
    onHiddenChange: () => {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
      void draw();
    },
    onView: (v) => {
      view = v;
      syncUrl();
      void draw();
    },
    onMinCards: (n) => {
      minCards = n;
      if (view === "tags") void draw();
    },
    onDimensions: (d) => {
      dimensions = d;
      syncUrl();
      void renderer?.setDimensions(d);
    },
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && (popup.isOpen || cardPanel.isOpen)) closeAll();
  });

  setStatus("Loading cards…");
  cards = await loadCards();
  setStatus("");
  panel.ready();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved?.trim()) map(saved);
}

main().catch((e: Error) => {
  setStatus(e.message);
  console.error(e);
});
