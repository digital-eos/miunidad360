import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usuarios } from "@/db/schema";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { getAuth } from "./server";
import { assertSuperadmin, NoAutorizadoError, type Actor } from "./permisos";

export type { Actor } from "./permisos";

/**
 * Resolves who is making the request:
 * 1. The legacy ADMIN_PASSWORD cookie → superadmin (kept until that login is removed).
 * 2. A Better Auth session → the `usuarios` row, read fresh so role or client changes
 *    apply on the next request.
 */
export async function getActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  if (await verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return { rol: "superadmin", usuarioId: null, clienteId: null, email: null };
  }

  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;

  const usuarioId = Number(session.user.id);
  if (!Number.isInteger(usuarioId)) return null;
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);
  if (!usuario) return null;

  if (usuario.rol === "superadmin") {
    return {
      rol: "superadmin",
      usuarioId: usuario.id,
      clienteId: null,
      email: usuario.email,
    };
  }
  if (usuario.clienteId === null) return null; // the DB check forbids it; never widen access
  return {
    rol: "cliente",
    usuarioId: usuario.id,
    clienteId: usuario.clienteId,
    email: usuario.email,
  };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new NoAutorizadoError();
  return actor;
}

export async function requireSuperadmin(): Promise<Actor & { rol: "superadmin" }> {
  const actor = await getActor();
  assertSuperadmin(actor);
  return actor;
}
