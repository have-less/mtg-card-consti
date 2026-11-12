import type { Card, GraphNode } from "../lib/types.js";
import { el } from "./dom.js";

const MARGIN = 12;
/** Below the search box. */
const DOCK_TOP = 56;

/** A docked window for one card: image, rules text and its tags, each clickable. */
export class CardPanel {
  private readonly root = el("div", "card-popup card-panel");

  constructor(
    parent: HTMLElement,
    private readonly onTag: (node: GraphNode) => void,
    private readonly onClose: () => void,
  ) {
    this.root.hidden = true;
    this.root.style.left = `${MARGIN}px`;
    this.root.style.top = `${DOCK_TOP}px`;
    parent.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Show a card with its tags, largest tag first. */
  open(card: Card, tags: GraphNode[]) {
    const header = el("div", "card-popup-header");
    const heading = el("div");
    const title = el("div", "card-popup-title");
    const link = el("a", undefined, card.name);
    link.href = card.scryfall_uri;
    link.target = "_blank";
    link.rel = "noopener";
    title.append(link);
    heading.append(title, el("div", "card-popup-meta", [card.mana_cost, card.type_line].filter(Boolean).join(" · ")));
    const close = el("button", "card-popup-close", "✕");
    close.title = "Close (Esc)";
    close.addEventListener("click", this.onClose);
    header.append(heading, close);

    const body = el("div", "card-popup-list card-panel-body");
    const top = el("div", "card-panel-top");
    if (card.image_uris.normal ?? card.image_uris.small) {
      const img = el("img", "card-panel-img");
      img.alt = card.name;
      img.src = (card.image_uris.normal ?? card.image_uris.small)!;
      top.append(img);
    }
    top.append(el("div", "card-panel-text", card.oracle_text));
    body.append(top, el("div", "tag-search-header", `Tags (${tags.length})`));
    for (const node of tags) {
      const row = el("div", "tag-search-row");
      row.append(el("span", undefined, node.label), el("span", "tag-search-count", String(node.card_count)));
      row.addEventListener("click", () => this.onTag(node));
      body.append(row);
    }

    this.root.replaceChildren(header, body);
    this.root.hidden = false;
  }

  close() {
    this.root.hidden = true;
  }
}
