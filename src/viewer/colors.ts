import { COLOR_IDENTITY_COLORS, OTHER_COLOR, PALETTE_12 } from "../config.js";
import type { Graph } from "../lib/types.js";

export type ColorMode = "community" | "root" | "identity";

export interface LegendEntry {
  label: string;
  color: string;
}

export interface Coloring {
  /** One CSS color per node. */
  colors: string[];
  legend: LegendEntry[];
}

/** Color every node for a mode, plus the legend that explains it. */
export function colorNodes(graph: Pick<Graph, "nodes" | "meta">, mode: ColorMode): Coloring {
  if (mode === "community") {
    // Communities are already numbered largest first.
    const named = graph.meta.communities.slice(0, PALETTE_12.length);
    return {
      colors: graph.nodes.map((n) => (n.community >= 0 ? (PALETTE_12[n.community] ?? OTHER_COLOR) : OTHER_COLOR)),
      legend: [...named.map((c) => ({ label: c.name, color: PALETTE_12[c.id]! })), { label: "other", color: OTHER_COLOR }],
    };
  }
  if (mode === "root") {
    const roots = [...new Set(graph.nodes.map((n) => n.root_parent))]
      .sort((a, b) => graph.nodes[b]!.card_count - graph.nodes[a]!.card_count || a - b)
      .slice(0, PALETTE_12.length);
    const colorOf = new Map(roots.map((r, i) => [r, PALETTE_12[i]!]));
    return {
      colors: graph.nodes.map((n) => colorOf.get(n.root_parent) ?? OTHER_COLOR),
      legend: [
        ...roots.map((r) => ({ label: graph.nodes[r]!.label, color: colorOf.get(r)! })),
        { label: "other", color: OTHER_COLOR },
      ],
    };
  }
  const names: Record<string, string> = {
    W: "white", U: "blue", B: "black", R: "red", G: "green", M: "multicolor", C: "colorless",
  };
  return {
    colors: graph.nodes.map((n) => COLOR_IDENTITY_COLORS[n.dominant_color] ?? OTHER_COLOR),
    legend: Object.entries(COLOR_IDENTITY_COLORS).map(([k, color]) => ({ label: names[k]!, color })),
  };
}
