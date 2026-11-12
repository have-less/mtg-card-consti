/** Lowercase with accents removed, so "altair" finds "Altaïr". */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
