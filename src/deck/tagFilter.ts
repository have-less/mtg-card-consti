import type { DeckTag } from "./deckGraph.js";

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** A searchable checklist of the deck's tags; unchecked tags are hidden from both views. */
export class TagFilter {
  readonly root = el("div", "tag-filter");
  private readonly heading = el("span");
  private readonly query = el("input", "card-popup-filter tag-filter-query");
  private readonly hideMatching = el("button", "tag-filter-action", "Hide matching");
  private readonly showAll = el("button", "tag-filter-action", "Show all");
  private readonly list = el("div", "tag-filter-list");
  private tags: readonly DeckTag[] = [];

  constructor(
    private readonly hidden: Set<string>,
    private readonly onChange: () => void,
  ) {
    const header = el("div", "tag-filter-header");
    const actions = el("div");
    actions.append(this.hideMatching, this.showAll);
    header.append(this.heading, actions);
    this.query.type = "search";
    this.query.placeholder = "Find tags to hide";
    this.query.addEventListener("input", () => this.render());
    this.hideMatching.addEventListener("click", () => {
      for (const t of this.matching()) this.hidden.add(t.node.id);
      this.changed();
    });
    this.showAll.addEventListener("click", () => {
      this.hidden.clear();
      this.changed();
    });
    this.list.addEventListener("change", (e) => {
      const box = e.target as HTMLInputElement;
      const id = box.dataset.id!;
      if (box.checked) this.hidden.delete(id);
      else this.hidden.add(id);
      this.changed();
    });
    this.root.append(header, this.query, this.list);
  }

  setTags(tags: readonly DeckTag[]) {
    this.tags = tags;
    this.render();
  }

  private changed() {
    this.render();
    this.onChange();
  }

  private matching(): readonly DeckTag[] {
    const q = this.query.value.trim().toLowerCase();
    return q ? this.tags.filter((t) => t.node.label.toLowerCase().includes(q)) : this.tags;
  }

  private render() {
    const hiddenHere = this.tags.filter((t) => this.hidden.has(t.node.id)).length;
    this.heading.textContent = `Tags · ${this.tags.length - hiddenHere} of ${this.tags.length} shown`;
    this.hideMatching.hidden = !this.query.value.trim();
    this.showAll.hidden = hiddenHere === 0;
    const rows = this.matching().map(({ node, cards }) => {
      const row = el("label", "tag-filter-row");
      const box = el("input");
      box.type = "checkbox";
      box.checked = !this.hidden.has(node.id);
      box.dataset.id = node.id;
      row.append(box, el("span", "tag-filter-label", node.label), el("span", "tag-search-count", String(cards.length)));
      return row;
    });
    this.list.replaceChildren(...rows);
  }
}
