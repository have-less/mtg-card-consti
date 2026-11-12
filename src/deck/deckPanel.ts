import { dimensionToggle, type Dimensions } from "../viewer/dimensions.js";
import { el } from "../viewer/dom.js";
import type { DeckTag } from "./deckGraph.js";
import { TagFilter } from "./tagFilter.js";

export type DeckView = "tags" | "cards";

export interface DeckPanelOptions {
  text: string;
  view: DeckView;
  minCards: number;
  dimensions: Dimensions;
  /** Tag ids hidden from both views; the panel edits this set in place. */
  hidden: Set<string>;
  hideLands: boolean;
  onMap: (text: string) => void;
  onHideLands: (hide: boolean) => void;
  onView: (view: DeckView) => void;
  onMinCards: (n: number) => void;
  onDimensions: (d: Dimensions) => void;
  onHiddenChange: () => void;
}

const MAX_MIN_CARDS = 10;

/** The deck page's side panel: paste a list, see what matched, and pick the view. */
export class DeckPanel {
  private readonly input = el("textarea", "deck-input");
  private readonly mapButton = el("button", "deck-button", "Loading cards…");
  private readonly summary = el("div", "deck-summary");
  private readonly missing = el("details", "deck-missing");
  private readonly controls = el("div", "deck-controls");
  private readonly viewButtons: Record<DeckView, HTMLButtonElement>;
  private readonly minRow = el("label", "deck-min");
  private readonly minValue = el("span");
  private readonly landsRow = el("label", "deck-check");
  private readonly landsLabel = el("span");
  private readonly tagFilter: TagFilter;

  constructor(parent: HTMLElement, opts: DeckPanelOptions) {
    this.tagFilter = new TagFilter(opts.hidden, opts.onHiddenChange);
    const landsBox = el("input");
    landsBox.type = "checkbox";
    landsBox.checked = opts.hideLands;
    landsBox.addEventListener("change", () => opts.onHideLands(landsBox.checked));
    this.landsRow.append(landsBox, this.landsLabel);
    const root = el("div", "deck-panel");
    const header = el("div", "deck-header");
    const nav = el("a", "deck-nav", "Tag graph →");
    nav.href = "/";
    header.append(el("div", "card-popup-title", "Deck"), nav);

    this.input.value = opts.text;
    this.input.placeholder = "Paste a deck list, one card per line\n1 Sol Ring\n1 Lightning Bolt\n…";
    this.input.spellcheck = false;
    this.mapButton.disabled = true;
    this.mapButton.addEventListener("click", () => opts.onMap(this.input.value));
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !this.mapButton.disabled) opts.onMap(this.input.value);
    });

    const segmented = el("div", "deck-segmented");
    this.viewButtons = { tags: el("button", undefined, "Tags"), cards: el("button", undefined, "Cards") };
    for (const view of ["tags", "cards"] as const) {
      this.viewButtons[view].addEventListener("click", () => {
        this.setView(view);
        opts.onView(view);
      });
      segmented.append(this.viewButtons[view]);
    }
    this.setView(opts.view);

    this.controls.append(segmented, dimensionToggle("deck-button deck-dim", opts.dimensions, opts.onDimensions));

    const range = el("input");
    range.type = "range";
    range.min = "1";
    range.max = String(MAX_MIN_CARDS);
    range.value = String(opts.minCards);
    const showMin = () => (this.minValue.textContent = `Tags on at least ${range.value} deck card${range.value === "1" ? "" : "s"}`);
    showMin();
    range.addEventListener("input", () => {
      showMin();
      opts.onMinCards(Number(range.value));
    });
    this.minRow.append(this.minValue, range);

    this.controls.hidden = true;
    this.minRow.hidden = true;
    this.missing.hidden = true;
    this.tagFilter.root.hidden = true;
    this.landsRow.hidden = true;
    root.append(
      header,
      this.input,
      this.mapButton,
      this.summary,
      this.missing,
      this.controls,
      this.landsRow,
      this.minRow,
      this.tagFilter.root,
    );
    parent.append(root);
  }

  /** Enable mapping once cards.json has loaded. */
  ready() {
    this.mapButton.disabled = false;
    this.mapButton.textContent = "Map deck";
  }

  showResult(found: number, total: number, lands: number, tags: readonly DeckTag[], missing: readonly string[]) {
    this.summary.textContent = total
      ? `${found} of ${total} cards found · ${tags.length} tags`
      : "No cards in the list";
    this.landsLabel.textContent = `Hide lands (${lands})`;
    this.landsRow.hidden = found === 0;
    this.tagFilter.setTags(tags);
    this.tagFilter.root.hidden = found === 0;
    this.missing.replaceChildren(el("summary", undefined, `${missing.length} not found`));
    const list = el("div", "deck-missing-list");
    list.textContent = missing.join("\n");
    this.missing.append(list);
    this.missing.hidden = missing.length === 0;
    this.controls.hidden = found === 0;
    this.minRow.hidden = found === 0 || !this.viewButtons.tags.classList.contains("active");
  }

  setView(view: DeckView) {
    for (const v of ["tags", "cards"] as const) this.viewButtons[v].classList.toggle("active", v === view);
    if (!this.controls.hidden) this.minRow.hidden = view !== "tags";
  }

  setError(message: string) {
    this.summary.textContent = message;
  }
}
