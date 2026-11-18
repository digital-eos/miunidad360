import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, projects, unidades } from "@/db/schema";
import { toUnidad, type Unidad } from "@/lib/unidades/types";
import { filtroProyectos, type Actor } from "@/lib/auth/permisos";

/**
 * Admin reads, always scoped to the actor: a cliente only ever loads rows of its own
 * projects, whatever the URL asks for.
 */

export async function proyectosVisibles(actor: Actor) {
  return db
    .select()
    .from(projects)
    .where(filtroProyectos(actor))
    .orderBy(asc(projects.id));
}

export async function unidadesDeProyecto(
  actor: Actor,
  proyectoId: number
): Promise<Unidad[]> {
  const rows = await db
    .select({ unidad: unidades })
    .from(unidades)
    .innerJoin(projects, eq(projects.id, unidades.proyectoId))
    .where(and(eq(unidades.proyectoId, proyectoId), filtroProyectos(actor)))
    .orderBy(asc(unidades.id));
  return rows.map((r) => toUnidad(r.unidad));
}

/** Superadmin: every lead. Cliente: leads of its projects only (never project-less ones). */
export async function leadsVisibles(actor: Actor) {
  const filtro =
    actor.rol === "superadmin"
      ? undefined
      : inArray(
          leads.projectId,
          db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.clienteId, actor.clienteId))
        );
  return db.select().from(leads).where(filtro).orderBy(desc(leads.createdAt)).limit(100);
}
