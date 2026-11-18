import { and, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, unidades } from "@/db/schema";

/**
 * Who is acting in /admin, and what they may touch. Every Server Action and every admin
 * query goes through these helpers: the UI hiding a button is never the protection.
 *
 * - superadmin: every project, including demos without a client.
 * - cliente: only the projects whose `cliente_id` is theirs.
 */
export type Actor =
  | { rol: "superadmin"; usuarioId: number | null; clienteId: null; email: string | null }
  | { rol: "cliente"; usuarioId: number; clienteId: number; email: string };

export class NoAutorizadoError extends Error {
  constructor() {
    super("No autorizado.");
    this.name = "NoAutorizadoError";
  }
}

export function esSuperadmin(actor: Actor): boolean {
  return actor.rol === "superadmin";
}

export function assertSuperadmin(
  actor: Actor | null
): asserts actor is Actor & { rol: "superadmin" } {
  if (!actor || actor.rol !== "superadmin") throw new NoAutorizadoError();
}

/** WHERE condition on `projects` limiting rows to the actor's projects (undefined = all). */
export function filtroProyectos(actor: Actor): SQL | undefined {
  return actor.rol === "superadmin" ? undefined : eq(projects.clienteId, actor.clienteId);
}

/** WHERE condition on `unidades` limiting rows to units of the actor's projects. */
export function filtroUnidades(actor: Actor): SQL | undefined {
  if (actor.rol === "superadmin") return undefined;
  return inArray(
    unidades.proyectoId,
    db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.clienteId, actor.clienteId))
  );
}

/** Throws unless the actor may manage the project. Same error whether it exists or not. */
export async function assertProyecto(
  actor: Actor | null,
  proyectoId: number
): Promise<void> {
  if (!actor || !Number.isInteger(proyectoId)) throw new NoAutorizadoError();
  if (actor.rol === "superadmin") return;
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, proyectoId), eq(projects.clienteId, actor.clienteId)))
    .limit(1);
  if (!row) throw new NoAutorizadoError();
}

/** Throws unless the unit belongs to one of the actor's projects. */
export async function assertUnidad(actor: Actor | null, unidadId: number): Promise<void> {
  if (!actor || !Number.isInteger(unidadId)) throw new NoAutorizadoError();
  if (actor.rol === "superadmin") return;
  const [row] = await db
    .select({ id: unidades.id })
    .from(unidades)
    .innerJoin(projects, eq(projects.id, unidades.proyectoId))
    .where(and(eq(unidades.id, unidadId), eq(projects.clienteId, actor.clienteId)))
    .limit(1);
  if (!row) throw new NoAutorizadoError();
}
