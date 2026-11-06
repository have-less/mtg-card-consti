/**
 * Normalized pointwise mutual information (Bouma 2009), in [-1, 1].
 * 1 when two tags always appear together, 0 at chance, -1 when they never do.
 *   n    = cards with at least one leaf tag
 *   na   = cards tagged a, nb = cards tagged b, nab = cards tagged both
 */
export function npmi(nab: number, na: number, nb: number, n: number): number {
  if (nab === n) return 1; // ln(1) / -ln(1) is 0 / 0
  return Math.log((n * nab) / (na * nb)) / -Math.log(nab / n);
}

export function cosine(nab: number, na: number, nb: number): number {
  return nab / Math.sqrt(na * nb);
}

/** How many times more often a pair shares cards than chance predicts. */
export function liftOverChance(nab: number, na: number, nb: number, n: number): number {
  return (n * nab) / (na * nb);
}

export const round3 = (x: number) => Math.round(x * 1000) / 1000;
