import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";

/**
 * Visibility of a client project page (/<cliente>/<slug>): with `privado` the page is
 * reachable by its link but not indexed nor in the sitemap.
 *
 * Per-project passwords were removed: clients now sign in to their account (/admin) to see
 * their projects, and project pages are shared by private link. The `password_hash` column
 * is left in the database, unused, in case a client asks for it again.
 */

export type ProyectoAcceso = {
  id: number;
  slug: string;
  name: string;
  privado: boolean;
};

export async function getProyectoAcceso(slug: string): Promise<ProyectoAcceso | null> {
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      name: projects.name,
      privado: projects.privado,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return row ?? null;
}

export function isNoIndex(p: Pick<ProyectoAcceso, "privado">): boolean {
  return p.privado;
}
