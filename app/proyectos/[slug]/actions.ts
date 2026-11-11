"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACCESS_TTL_SECONDS,
  accessCookieName,
  createAccessToken,
  getProyectoAcceso,
  verifyPassword,
} from "@/lib/proyectos/acceso";
import { isRateLimited } from "@/lib/rate-limit";

export type UnlockResult = { error?: string };

export async function unlockProyecto(
  slug: string,
  _prev: UnlockResult | null,
  formData: FormData,
): Promise<UnlockResult> {
  const password = String(formData.get("password") ?? "");

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(`proyecto-login:${slug}:${ip}`)) {
    return { error: "Demasiados intentos. Probá de nuevo en un minuto." };
  }

  const proyecto = await getProyectoAcceso(slug);
  if (!proyecto?.passwordHash) redirect(`/proyectos/${slug}`);
  if (!verifyPassword(password, proyecto.passwordHash)) {
    return { error: "Contraseña incorrecta." };
  }

  const cookieStore = await cookies();
  cookieStore.set(accessCookieName(slug), createAccessToken(slug, proyecto.passwordHash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACCESS_TTL_SECONDS,
    // "/" so the units API (/api/projects/<slug>/unidades) receives it too.
    path: "/",
  });
  redirect(`/proyectos/${slug}`);
}
