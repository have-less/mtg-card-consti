import type { GraphNode } from "../lib/types.js";
import { searchTags } from "./search.js";

/** Search box with a result list; arrow keys move, Enter or click picks. */
export class TagSearch {
  private readonly root = document.createElement("div");
  private readonly input = document.createElement("input");
  private readonly results = document.createElement("div");
  private matches: GraphNode[] = [];
  private active = 0;

  constructor(parent: HTMLElement, nodes: readonly GraphNode[], onPick: (node: GraphNode) => void) {
    this.root.className = "tag-search";
    this.input.type = "search";
    this.input.placeholder = "Search tags";
    this.results.className = "tag-search-results";
    this.root.append(this.input, this.results);
    parent.append(this.root);

    const pick = (n: GraphNode | undefined) => {
      if (!n) return;
      this.input.value = n.label;
      this.show([]);
      this.input.blur();
      onPick(n);
    };

    this.input.addEventListener("input", () => {
      this.active = 0;
      this.show(searchTags(nodes, this.input.value));
    });
    this.input.addEventListener("focus", () => this.input.select());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = this.matches.length;
        if (n) this.active = (this.active + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
        this.show(this.matches);
      } else if (e.key === "Enter") {
        pick(this.matches[this.active]);
      } else if (e.key === "Escape") {
        e.stopPropagation();
        this.input.value = "";
        this.show([]);
        this.input.blur();
      }
    });
    this.results.addEventListener("mousedown", (e) => {
      const i = Number((e.target as HTMLElement).closest<HTMLElement>("[data-i]")?.dataset.i);
      if (!Number.isNaN(i)) {
        e.preventDefault();
        pick(this.matches[i]);
      }
    });
    this.input.addEventListener("blur", () => this.show([]));
  }

  private show(matches: GraphNode[]) {
    this.matches = matches;
    this.results.replaceChildren(
      ...matches.map((n, i) => {
        const row = document.createElement("div");
        row.className = `tag-search-row${i === this.active ? " active" : ""}`;
        row.dataset.i = String(i);
        const label = document.createElement("span");
        label.textContent = n.label;
        const count = document.createElement("span");
        count.className = "tag-search-count";
        count.textContent = String(n.card_count);
        row.append(label, count);
        return row;
      }),
    );
    this.results.hidden = matches.length === 0;
  }
}
