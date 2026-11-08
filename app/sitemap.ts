import type { MetadataRoute } from "next";
import { BIM_DEMO_PATH } from "@/lib/bim/route";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://miunidad360.com.ar";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = ["", "/demos/selector", BIM_DEMO_PATH, "/demos/lotes", "/privacidad"];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/demos") ? 0.8 : 0.3,
  }));
}
