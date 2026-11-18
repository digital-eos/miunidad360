"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, unidades } from "@/db/schema";
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

export type IniciarSesionResult = { error?: string };

const credencialesSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos.";

/** Email + password login for the accounts created in /admin/clientes. */
export async function iniciarSesion(
  _prev: IniciarSesionResult | null,
  formData: FormData
): Promise<IniciarSesionResult> {
  const parsed = credencialesSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: CREDENCIALES_INVALIDAS };
  const { email, password } = parsed.data;

  if (
    isRateLimited(`login:ip:${await clientIp()}`) ||
    isRateLimited(`login:email:${email}`)
  ) {
    return { error: "Demasiados intentos. Probá de nuevo en un minuto." };
  }

  try {
    await getAuth().api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    // Same answer for an unknown email and a wrong password.
    return { error: CREDENCIALES_INVALIDAS };
  }
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_COOKIE_NAME, path: "/admin" });
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    // No Better Auth session (ADMIN_PASSWORD login): nothing else to clear.
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
