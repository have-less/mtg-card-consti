import type { Card, GraphNode } from "../lib/types.js";
import { searchCards, searchTags } from "./search.js";

const TAG_LIMIT = 8;
const CARD_LIMIT = 8;

type Result = { kind: "tag"; node: GraphNode } | { kind: "card"; card: Card };

export interface SearchHandlers {
  onTag: (node: GraphNode) => void;
  onCard: (card: Card) => void;
}

/**
 * One box that searches tag names and card names, with results grouped
 * under "Tags" and "Cards". Arrow keys move, Enter or a click picks.
 */
export class SearchBox {
  private readonly root = document.createElement("div");
  private readonly input = document.createElement("input");
  private readonly results = document.createElement("div");
  private matches: Result[] = [];
  private active = 0;

  constructor(
    parent: HTMLElement,
    private readonly nodes: readonly GraphNode[],
    /** Undefined while cards.json is still loading. */
    private readonly getCards: () => readonly Card[] | undefined,
    handlers: SearchHandlers,
  ) {
    this.root.className = "tag-search";
    this.input.type = "search";
    this.input.placeholder = "Search tags or cards";
    this.results.className = "tag-search-results";
    this.results.hidden = true;
    this.root.append(this.input, this.results);
    parent.append(this.root);

    const pick = (r: Result | undefined) => {
      if (!r) return;
      this.input.value = r.kind === "tag" ? r.node.label : r.card.name;
      this.clear();
      this.input.blur();
      if (r.kind === "tag") handlers.onTag(r.node);
      else handlers.onCard(r.card);
    };

    this.input.addEventListener("input", () => {
      this.active = 0;
      this.update();
    });
    this.input.addEventListener("focus", () => this.input.select());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = this.matches.length;
        if (n) this.active = (this.active + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
        this.render();
      } else if (e.key === "Enter") {
        pick(this.matches[this.active]);
      } else if (e.key === "Escape") {
        e.stopPropagation();
        this.input.value = "";
        this.clear();
        this.input.blur();
      }
    });
    this.results.addEventListener("mousedown", (e) => {
      const i = Number((e.target as HTMLElement).closest<HTMLElement>("[data-i]")?.dataset.i);
      e.preventDefault();
      if (!Number.isNaN(i)) pick(this.matches[i]);
    });
    this.input.addEventListener("blur", () => this.clear());
  }

  /** Re-run the current query, e.g. once cards have loaded. */
  refresh() {
    if (document.activeElement === this.input) this.update();
  }

  private update() {
    const q = this.input.value;
    const cards = this.getCards();
    this.matches = [
      ...searchTags(this.nodes, q, TAG_LIMIT).map((node): Result => ({ kind: "tag", node })),
      ...(cards ? searchCards(cards, q, CARD_LIMIT) : []).map((card): Result => ({ kind: "card", card })),
    ];
    this.render(q.trim() !== "" && !cards);
  }

  private clear() {
    this.matches = [];
    this.render();
  }

  private render(cardsLoading = false) {
    const rows: HTMLElement[] = [];
    const header = (text: string) => {
      const h = document.createElement("div");
      h.className = "tag-search-header";
      h.textContent = text;
      rows.push(h);
    };
    this.matches.forEach((r, i) => {
      if (i === 0 && r.kind === "tag") header("Tags");
      if (r.kind === "card" && this.matches[i - 1]?.kind !== "card") header("Cards");
      const row = document.createElement("div");
      row.className = `tag-search-row${i === this.active ? " active" : ""}`;
      row.dataset.i = String(i);
      const label = document.createElement("span");
      const detail = document.createElement("span");
      detail.className = "tag-search-count";
      if (r.kind === "tag") {
        label.textContent = r.node.label;
        detail.textContent = String(r.node.card_count);
      } else {
        label.textContent = r.card.name;
        detail.textContent = `${r.card.tags.length} tags`;
      }
      row.append(label, detail);
      rows.push(row);
    });
    if (cardsLoading) {
      header("Cards");
      const note = document.createElement("div");
      note.className = "tag-search-note";
      note.textContent = "Loading cards…";
      rows.push(note);
    }
    this.results.replaceChildren(...rows);
    this.results.hidden = rows.length === 0;
  }
}
