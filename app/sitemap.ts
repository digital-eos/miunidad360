import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { BIM_DEMO_PATH } from "@/lib/bim/route";
import { getProyectoAcceso, isNoIndex } from "@/lib/proyectos/acceso";
import { PROYECTOS } from "@/app/proyectos/[slug]/registro";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://miunidad360.com";

/** Public demos: always listed. */
const STATIC_ROUTES = ["", "/demos", "/demos/torre-aldrey", BIM_DEMO_PATH, "/demos/lotes", "/demos/departamento", "/privacidad"];

/**
 * Client projects are listed only when they are neither private nor password-protected.
 * If the database can't be read, none is listed: better missing than leaked.
 */
async function publicProjectRoutes(): Promise<string[]> {
  const slugs = Object.keys(PROYECTOS);
  if (slugs.length === 0) return [];
  // Read the flags at request time, so a project made private leaves the sitemap at once.
  await connection();
  try {
    const rows = await Promise.all(slugs.map((slug) => getProyectoAcceso(slug)));
    return rows.filter((p) => p !== null && !isNoIndex(p)).map((p) => `/proyectos/${p!.slug}`);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes = [...STATIC_ROUTES, ...(await publicProjectRoutes())];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority:
      route === ""
        ? 1
        : route.startsWith("/demos") || route.startsWith("/proyectos")
          ? 0.8
          : 0.3,
  }));
}
