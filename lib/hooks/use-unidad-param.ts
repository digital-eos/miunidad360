/**
 * Shareable unit links: every demo reads and writes `?unidad=<código>` so a ficha can be
 * opened straight from a link. Uses the History API directly (Next.js keeps it in sync)
 * so it works without a Suspense boundary around useSearchParams.
 */
export function readUnidadParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("unidad");
}

export function writeUnidadParam(codigo: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (codigo) url.searchParams.set("unidad", codigo);
  else url.searchParams.delete("unidad");
  if (url.href === window.location.href) return;
  window.history.replaceState(window.history.state, "", url);
}
