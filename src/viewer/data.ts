import type { Card, Graph } from "../lib/types.js";

const GRAPH_URL = "/data/out/graph.json";
const CARDS_URL = "/data/out/cards.json";

export async function loadGraph(): Promise<Graph> {
  const res = await fetch(GRAPH_URL);
  if (!res.ok) throw new Error(`Could not load ${GRAPH_URL} (${res.status}). Run npm run prep first.`);
  return (await res.json()) as Graph;
}

export async function loadCards(): Promise<Card[]> {
  const res = await fetch(CARDS_URL);
  if (!res.ok) throw new Error(`Could not load ${CARDS_URL} (${res.status})`);
  return ((await res.json()) as { cards: Card[] }).cards;
}
