import type { Card } from "../lib/types.js";

const GAP = 8;
const MARGIN = 12;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** A hover card: large image plus name, cost, type, rules text and set, shown beside a list. */
export class CardPreview {
  private readonly root = el("div", "card-preview");
  private current: Card | undefined;

  constructor(parent: HTMLElement) {
    this.root.hidden = true;
    parent.append(this.root);
  }

  /** Show a card next to `beside` (the list's box), lined up with `row` where it fits. */
  show(card: Card, row: DOMRect, beside: DOMRect) {
    if (card !== this.current) {
      this.current = card;
      this.root.replaceChildren(...content(card));
    }
    this.root.hidden = false;
    const { offsetWidth: w, offsetHeight: h } = this.root;
    const right = beside.right + GAP;
    const left = right + w + MARGIN <= window.innerWidth ? right : beside.left - GAP - w;
    const top = Math.min(Math.max(MARGIN, row.top), window.innerHeight - h - MARGIN);
    this.root.style.left = `${Math.max(MARGIN, left)}px`;
    this.root.style.top = `${Math.max(MARGIN, top)}px`;
  }

  hide() {
    this.root.hidden = true;
  }
}

function content(card: Card): HTMLElement[] {
  const out: HTMLElement[] = [];
  const src = card.image_uris.normal ?? card.image_uris.small;
  if (src) {
    const img = el("img", "card-preview-img");
    img.alt = card.name;
    img.src = src;
    out.push(img);
  }
  const head = el("div", "card-preview-head");
  head.append(el("span", "card-preview-name", card.name), el("span", "card-preview-cost", card.mana_cost));
  out.push(head, el("div", "card-preview-type", card.type_line));
  if (card.oracle_text) out.push(el("div", "card-preview-text", card.oracle_text));
  const rarity = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);
  const set = [card.set_name, rarity].filter(Boolean).join(" · ");
  if (set) out.push(el("div", "card-preview-set", set));
  return out;
}
