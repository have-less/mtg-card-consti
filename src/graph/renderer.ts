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
  /** 2 for the flat pan/zoom view, 3 for the orbit camera. */
  dimensions?: 2 | 3;
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

  private config: CosmographConfig;

  constructor(container: HTMLElement, opts: RendererOptions) {
    this.config = {
      spaceDimensions: opts.dimensions ?? 2,
      pointSphereShading: true,
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
    };
    this.cosmograph = new Cosmograph(container, this.config);
  }

  /** Switch between the flat view and the 3D orbit view, re-running the layout. */
  async setDimensions(dimensions: 2 | 3) {
    this.config = { ...this.config, spaceDimensions: dimensions };
    await this.cosmograph.setConfig(this.config);
    this.cosmograph.start(1);
  }

  /** Replace the drawn points and links, re-running the layout. */
  async setData(points: PointRow[], links: LinkRow[], showClusterLabels: boolean) {
    this.config = { ...this.config, points, links, showClusterLabels };
    this.clearSelection();
    await this.cosmograph.setConfig(this.config);
  }

  /** Select a point with its neighbors and zoom to it. */
  focusPoint(index: number) {
    this.cosmograph.selectPoint(index, false, true);
    this.cosmograph.setFocusedPoint(index);
    this.cosmograph.zoomToPoint(index, 700);
  }

  /** Select just these points (no neighbors) and zoom to fit them. */
  focusPoints(indices: number[]) {
    this.cosmograph.setFocusedPoint(undefined);
    this.cosmograph.selectPoints(indices, false, false);
    this.cosmograph.fitViewByIndices(indices, 700);
  }

  clearSelection() {
    this.cosmograph.setFocusedPoint(undefined);
    this.cosmograph.unselectAll();
  }

  destroy(): Promise<void> {
    return this.cosmograph.destroy();
  }
}
