/**
 * Who each client project belongs to. A project's link is /<cliente>/<slug>, e.g.
 * /diegovargas/casa-citra: one unique link per client and project. The old /proyectos/<slug>
 * links redirect there.
 *
 * Kept apart from the page registry (app/proyectos/[slug]/registro.tsx), with plain slugs, so
 * client components (the site-wide WhatsApp button) can read it without pulling in any page.
 */
export const CLIENTE_DE_PROYECTO: Record<string, string> = {
  "casa-citra": "diegovargas",
};

const CLIENTES = new Set(Object.values(CLIENTE_DE_PROYECTO));

/** Unique link of a client project, or null when the project has no client. */
export function proyectoPath(slug: string): string | null {
  const cliente = CLIENTE_DE_PROYECTO[slug];
  return cliente ? `/${cliente}/${slug}` : null;
}

/** True when the path is a client project page (/<cliente>/<slug>). */
export function esPaginaDeCliente(pathname: string | null): boolean {
  if (!pathname) return false;
  const [cliente, slug, ...resto] = pathname.split("/").filter(Boolean);
  return resto.length === 0 && CLIENTES.has(cliente) && CLIENTE_DE_PROYECTO[slug] === cliente;
}
