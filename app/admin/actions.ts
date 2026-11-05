"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { unidades } from "@/db/schema";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/admin/auth";
import { isRateLimited } from "@/lib/rate-limit";

export type AdminLoginResult = { success: boolean; error?: string };

async function requireAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    throw new Error("No autorizado.");
  }
}

export async function adminLogin(
  _prevState: AdminLoginResult | null,
  formData: FormData,
): Promise<AdminLoginResult> {
  const password = String(formData.get("password") ?? "");

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(`admin-login:${ip}`)) {
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

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_COOKIE_NAME, path: "/admin" });
  redirect("/admin");
}

export async function updateUnidadEstado(
  unidadId: number,
  estado: "disponible" | "reservada" | "vendida",
) {
  await requireAdminSession();
  if (!["disponible", "reservada", "vendida"].includes(estado)) {
    throw new Error("Estado inválido.");
  }
  await db.update(unidades).set({ estado, updatedAt: new Date() }).where(eq(unidades.id, unidadId));
  revalidatePath("/admin");
}

export async function updateUnidadPrecio(unidadId: number, precio: number) {
  await requireAdminSession();
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error("Precio inválido.");
  }
  await db
    .update(unidades)
    .set({ precio: Math.round(precio), updatedAt: new Date() })
    .where(eq(unidades.id, unidadId));
  revalidatePath("/admin");
}
