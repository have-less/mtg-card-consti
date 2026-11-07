import type { GraphNode } from "../lib/types.js";
import type { TagCard } from "./cardIndex.js";
import { filterCards } from "./search.js";

const PAGE_SIZE = 50;
const MARGIN = 12;
/** Below the tag search box. */
const DOCK_TOP = 56;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** A small floating window listing a tag's cards, appended 50 at a time as you scroll. */
export class CardPopup {
  private readonly root = el("div", "card-popup");
  private readonly title = el("div", "card-popup-title");
  private readonly meta = el("div", "card-popup-meta");
  private readonly filter = el("input", "card-popup-filter");
  private readonly list = el("div", "card-popup-list");
  private allCards: TagCard[] | null = null;
  /** The tag's card count, shown while cards are loading. */
  private expected = 0;
  private cards: TagCard[] = [];
  private shown = 0;

  constructor(parent: HTMLElement, onClose: () => void) {
    const header = el("div", "card-popup-header");
    const close = el("button", "card-popup-close", "✕");
    close.title = "Close (Esc)";
    close.addEventListener("click", onClose);
    const heading = el("div");
    heading.append(this.title, this.meta);
    header.append(heading, close);
    this.filter.type = "search";
    this.filter.placeholder = "Filter by name, type or text";
    this.filter.addEventListener("input", () => this.render());
    this.root.append(header, this.filter, this.list);
    this.root.hidden = true;
    this.list.addEventListener("scroll", () => {
      if (this.list.scrollTop + this.list.clientHeight > this.list.scrollHeight - 200) this.appendPage();
    });
    parent.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /**
   * Open for a tag next to a screen point, or docked top left when no point is
   * given. Pass cards as null while they are still loading.
   */
  open(node: GraphNode, cards: TagCard[] | null, at?: { x: number; y: number }) {
    this.title.replaceChildren();
    const link = el("a", undefined, node.label);
    link.href = `https://tagger.scryfall.com/tags/card/${node.slug}`;
    link.target = "_blank";
    link.rel = "noopener";
    this.title.append(link);
    this.filter.value = "";
    this.expected = node.card_count;
    this.setCards(cards);
    this.root.hidden = false;
    this.place(at);
  }

  setCards(cards: TagCard[] | null) {
    this.allCards = cards;
    this.render();
  }

  private render() {
    this.list.replaceChildren();
    this.list.scrollTop = 0;
    this.shown = 0;
    const plural = (n: number) => `${n} card${n === 1 ? "" : "s"}`;
    if (!this.allCards) {
      this.cards = [];
      this.meta.textContent = plural(this.expected);
      this.list.append(el("div", "card-popup-empty", "Loading cards…"));
      return;
    }
    this.cards = filterCards(this.allCards, this.filter.value);
    const total = this.allCards.length;
    this.meta.textContent = this.cards.length === total ? plural(total) : `${this.cards.length} of ${plural(total)}`;
    if (this.cards.length === 0) this.list.append(el("div", "card-popup-empty", total ? "No matching cards" : "No cards"));
    this.appendPage();
  }

  close() {
    this.root.hidden = true;
  }

  private appendPage() {
    const end = Math.min(this.cards.length, this.shown + PAGE_SIZE);
    for (; this.shown < end; this.shown++) this.list.append(cardRow(this.cards[this.shown]!));
  }

  private place(at?: { x: number; y: number }) {
    if (!at) {
      this.root.style.left = `${MARGIN}px`;
      this.root.style.top = `${DOCK_TOP}px`;
      return;
    }
    const { x, y } = at;
    const { offsetWidth: w, offsetHeight: h } = this.root;
    const left = x + MARGIN + w > window.innerWidth ? x - MARGIN - w : x + MARGIN;
    const top = Math.min(Math.max(MARGIN, y - h / 2), window.innerHeight - h - MARGIN);
    this.root.style.left = `${Math.max(MARGIN, left)}px`;
    this.root.style.top = `${Math.max(MARGIN, top)}px`;
  }
}

function cardRow({ card }: TagCard): HTMLElement {
  const row = el("a", "card-row");
  row.href = card.scryfall_uri;
  row.target = "_blank";
  row.rel = "noopener";
  const img = el("img", "card-row-img");
  img.loading = "lazy";
  img.alt = "";
  if (card.image_uris.small) img.src = card.image_uris.small;
  const text = el("div", "card-row-text");
  const top = el("div", "card-row-top");
  top.append(el("span", "card-row-name", card.name), el("span", "card-row-cost", card.mana_cost));
  text.append(top, el("div", "card-row-type", card.type_line));
  row.append(img, text);
  return row;
}
