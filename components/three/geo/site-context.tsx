"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SITE, type GeoSite } from "@/lib/geo/site";

/**
 * The real-world lot the map layers (MapGround, MapIntro) draw around. Defaults to Torre
 * Aldrey (Cataluña II), so its scene needs no provider; other projects wrap their map in
 * <GeoSiteProvider site={…}>.
 */
const GeoSiteContext = createContext<GeoSite>(SITE);

export function GeoSiteProvider({ site, children }: { site: GeoSite; children: ReactNode }) {
  return <GeoSiteContext.Provider value={site}>{children}</GeoSiteContext.Provider>;
}

export function useGeoSite(): GeoSite {
  return useContext(GeoSiteContext);
}
