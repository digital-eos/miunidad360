"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, unidades, usuarios } from "@/db/schema";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/proyectos/acceso";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/admin/auth";
import { requireActor } from "@/lib/auth/actor";
import { getAuth } from "@/lib/auth/server";
import {
  assertProyecto,
  assertUnidad,
  filtroProyectos,
  filtroUnidades,
} from "@/lib/auth/permisos";
import { isRateLimited } from "@/lib/rate-limit";

export type AdminLoginResult = { success: boolean; error?: string };

async function clientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown"
  );
}

// ---- Login ----

/** Legacy superadmin login with ADMIN_PASSWORD (kept until it is removed). */
export async function adminLogin(
  _prevState: AdminLoginResult | null,
  formData: FormData
): Promise<AdminLoginResult> {
  const password = String(formData.get("password") ?? "");

  if (isRateLimited(`admin-login:${await clientIp()}`)) {
    return { success: false, error: "Demasiados intentos. Probá de nuevo en un minuto." };
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    return { success: false, error: "Contraseña incorrecta." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/admin",
  });

  redirect("/admin");
}

export type LinkMagicoResult = { enviado: boolean; error?: string };

const LINK_ENVIADO: LinkMagicoResult = { enviado: true };
const emailSchema = z.email().max(254);

/**
 * Asks for a magic link. Only users created by a superadmin get an email; the answer is
 * the same either way so nobody can probe which emails have an account.
 */
export async function solicitarLinkMagico(
  _prev: LinkMagicoResult | null,
  formData: FormData
): Promise<LinkMagicoResult> {
  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase()
  );
  if (!parsed.success) {
    return { enviado: false, error: "Revisá el email: no parece válido." };
  }
  const email = parsed.data;

  if (
    isRateLimited(`magic-link:ip:${await clientIp()}`) ||
    isRateLimited(`magic-link:email:${email}`)
  ) {
    return { enviado: false, error: "Demasiados pedidos. Probá de nuevo en un minuto." };
  }

  const [usuario] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  if (!usuario) return LINK_ENVIADO;

  try {
    await getAuth().api.signInMagicLink({
      body: { email, callbackURL: "/admin", errorCallbackURL: "/admin" },
      headers: await headers(),
    });
  } catch (error) {
    console.error("No se pudo enviar el link mágico:", error);
    return {
      enviado: false,
      error: "No pudimos enviar el email. Probá de nuevo en un rato.",
    };
  }
  return LINK_ENVIADO;
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_COOKIE_NAME, path: "/admin" });
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    // No Better Auth session (legacy password login): nothing else to clear.
  }
  redirect("/admin");
}

// ---- Units ----

const ESTADOS = ["disponible", "reservada", "vendida"] as const;

export async function updateUnidadEstado(
  unidadId: number,
  estado: (typeof ESTADOS)[number]
) {
  const actor = await requireActor();
  await assertUnidad(actor, unidadId);
  if (!ESTADOS.includes(estado)) {
    throw new Error("Estado inválido.");
  }
  await db
    .update(unidades)
    .set({ estado, updatedAt: new Date() })
    .where(and(eq(unidades.id, unidadId), filtroUnidades(actor)));
  revalidatePath("/admin");
}

export async function updateUnidadPrecio(unidadId: number, precio: number) {
  const actor = await requireActor();
  await assertUnidad(actor, unidadId);
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error("Precio inválido.");
  }
  await db
    .update(unidades)
    .set({ precio: Math.round(precio), updatedAt: new Date() })
    .where(and(eq(unidades.id, unidadId), filtroUnidades(actor)));
  revalidatePath("/admin");
}

// ---- Project visibility ----

/** Private link: the project page is not indexed nor listed in the sitemap. */
export async function updateProyectoPrivado(proyectoId: number, privado: boolean) {
  const actor = await requireActor();
  await assertProyecto(actor, proyectoId);
  await db
    .update(projects)
    .set({ privado: Boolean(privado) })
    .where(and(eq(projects.id, proyectoId), filtroProyectos(actor)));
  revalidatePath("/admin");
}

export type ProyectoPasswordResult = { success: boolean; error?: string };

/** Sets (or replaces) the project's password; every visitor has to enter the new one. */
export async function setProyectoPassword(
  proyectoId: number,
  _prev: ProyectoPasswordResult | null,
  formData: FormData
): Promise<ProyectoPasswordResult> {
  const actor = await requireActor();
  await assertProyecto(actor, proyectoId);
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  await db
    .update(projects)
    .set({ passwordHash: hashPassword(password) })
    .where(and(eq(projects.id, proyectoId), filtroProyectos(actor)));
  revalidatePath("/admin");
  return { success: true };
}

export async function clearProyectoPassword(proyectoId: number) {
  const actor = await requireActor();
  await assertProyecto(actor, proyectoId);
  await db
    .update(projects)
    .set({ passwordHash: null })
    .where(and(eq(projects.id, proyectoId), filtroProyectos(actor)));
  revalidatePath("/admin");
}
