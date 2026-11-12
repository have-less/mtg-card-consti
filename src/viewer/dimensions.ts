import { el } from "./dom.js";

export type Dimensions = 2 | 3;

/** `?view=3d` opens the 3D view; anything else is flat. */
export function dimensionsFromUrl(url: URL): Dimensions {
  return url.searchParams.get("view") === "3d" ? 3 : 2;
}

export function setDimensionsInUrl(url: URL, dimensions: Dimensions): void {
  if (dimensions === 3) url.searchParams.set("view", "3d");
  else url.searchParams.delete("view");
}

/** A button that flips between the flat and 3D views, labeled with the view it switches to. */
export function dimensionToggle(
  className: string,
  initial: Dimensions,
  onChange: (dimensions: Dimensions) => void,
): HTMLButtonElement {
  const button = el("button", className);
  let dimensions = initial;
  const label = () => {
    button.textContent = dimensions === 3 ? "2D" : "3D";
    button.title = dimensions === 3 ? "Switch to the flat view" : "Switch to 3D (drag to rotate, scroll to zoom, Shift-drag to pan)";
  };
  label();
  button.addEventListener("click", () => {
    dimensions = dimensions === 3 ? 2 : 3;
    label();
    onChange(dimensions);
  });
  return button;
}
