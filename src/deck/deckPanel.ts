export type DeckView = "tags" | "cards";

export interface DeckPanelOptions {
  text: string;
  view: DeckView;
  minCards: number;
  dimensions: 2 | 3;
  onMap: (text: string) => void;
  onView: (view: DeckView) => void;
  onMinCards: (n: number) => void;
  onDimensions: (d: 2 | 3) => void;
}

const MAX_MIN_CARDS = 10;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};

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
  private readonly dimButton = el("button", "deck-button deck-dim");

  constructor(parent: HTMLElement, opts: DeckPanelOptions) {
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

    let dimensions = opts.dimensions;
    const labelDim = () => (this.dimButton.textContent = dimensions === 3 ? "2D" : "3D");
    labelDim();
    this.dimButton.addEventListener("click", () => {
      dimensions = dimensions === 3 ? 2 : 3;
      labelDim();
      opts.onDimensions(dimensions);
    });
    this.controls.append(segmented, this.dimButton);

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
    root.append(header, this.input, this.mapButton, this.summary, this.missing, this.controls, this.minRow);
    parent.append(root);
  }

  /** Enable mapping once cards.json has loaded. */
  ready() {
    this.mapButton.disabled = false;
    this.mapButton.textContent = "Map deck";
  }

  showResult(found: number, total: number, tags: number, missing: readonly string[]) {
    this.summary.textContent = total
      ? `${found} of ${total} cards found · ${tags} tags`
      : "No cards in the list";
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
