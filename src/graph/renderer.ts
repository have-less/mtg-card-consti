/**
 * The only module that talks to Cosmograph (CC BY-NC 4.0). Keep it that way
 * so the engine can be swapped for cosmos.gl (MIT) later.
 */
import { Cosmograph, type CosmographConfig } from "@cosmograph/cosmograph";
import {
  DIM_OPACITY,
  DYNAMIC_LABELS_LIMIT,
  LINK_STRENGTH_RANGE,
  LINK_WIDTH_RANGE,
  POINT_SIZE_RANGE,
  SIMULATION,
  TOP_LABELS_LIMIT,
} from "../config.js";
import type { LinkRow, PointRow } from "../viewer/viewData.js";

export interface SimulationSettings {
  repulsion?: number;
  gravity?: number;
  linkSpring?: number;
  friction?: number;
  cluster: number;
}

export interface RendererOptions {
  points: PointRow[];
  links: LinkRow[];
  showClusterLabels: boolean;
  simulation?: SimulationSettings;
  /** Called once per data rebuild with what was drawn. */
  onRebuilt?: (stats: { points: number; links: number }) => void;
  /** A point was clicked; `at` is the click in viewport pixels. */
  onPointClick?: (index: number, at: { x: number; y: number }) => void;
  onBackgroundClick?: () => void;
}

function simulationConfig(s: SimulationSettings): CosmographConfig {
  const cfg: CosmographConfig = { simulationCluster: s.cluster };
  if (s.repulsion !== undefined) cfg.simulationRepulsion = s.repulsion;
  if (s.gravity !== undefined) cfg.simulationGravity = s.gravity;
  if (s.linkSpring !== undefined) cfg.simulationLinkSpring = s.linkSpring;
  if (s.friction !== undefined) cfg.simulationFriction = s.friction;
  return cfg;
}

export class GraphRenderer {
  private readonly cosmograph: Cosmograph;

  constructor(container: HTMLElement, opts: RendererOptions) {
    this.cosmograph = new Cosmograph(container, {
      points: opts.points,
      pointIdBy: "id",
      pointIndexBy: "idx",
      pointSizeBy: "size",
      pointSizeStrategy: "auto",
      pointSizeRange: POINT_SIZE_RANGE,
      pointColorBy: "color",
      pointColorStrategy: "direct",
      pointClusterBy: "cluster",
      // Only undefined means "no cluster"; null would become a cluster named "null".
      pointClusterByFn: (v: unknown) => v ?? undefined,
      pointLabelBy: "label",
      pointLabelWeightBy: "card_count",
      pointGreyoutOpacity: DIM_OPACITY,

      links: opts.links,
      linkSourceBy: "source",
      linkSourceIndexBy: "sourceidx",
      linkTargetBy: "target",
      linkTargetIndexBy: "targetidx",
      linkStrengthBy: "strength",
      linkStrengthRange: LINK_STRENGTH_RANGE,
      linkWidthBy: "width",
      linkWidthRange: LINK_WIDTH_RANGE,
      linkColorBy: "color",
      linkColorStrategy: "direct",
      linkIncludeColumns: ["edge", "kind"],

      showLabels: true,
      showTopLabels: true,
      showTopLabelsLimit: TOP_LABELS_LIMIT,
      showDynamicLabels: true,
      showDynamicLabelsLimit: DYNAMIC_LABELS_LIMIT,
      showClusterLabels: opts.showClusterLabels,
      scaleClusterLabels: true,
      showHoveredPointLabel: true,

      preservePointPositionsOnDataUpdate: true,
      fitViewOnInit: true,
      ...simulationConfig(opts.simulation ?? SIMULATION),

      onGraphRebuilt: ({ pointsCount, linksCount }) => opts.onRebuilt?.({ points: pointsCount, links: linksCount }),
      onSimulationEnd: () => this.cosmograph.fitView(600),

      selectPointOnClick: true,
      onPointClick: (index, _pos, event) => opts.onPointClick?.(index, { x: event.clientX, y: event.clientY }),
      onBackgroundClick: () => opts.onBackgroundClick?.(),
    });
  }

  /** Select a point with its neighbors and zoom to it. */
  focusPoint(index: number) {
    this.cosmograph.selectPoint(index, false, true);
    this.cosmograph.setFocusedPoint(index);
    this.cosmograph.zoomToPoint(index, 700);
  }

  clearSelection() {
    this.cosmograph.setFocusedPoint(undefined);
    this.cosmograph.unselectAll();
  }

  destroy(): Promise<void> {
    return this.cosmograph.destroy();
  }
}
