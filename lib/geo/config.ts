/**
 * Google Maps Platform key for the Map Tiles API (Photorealistic 3D Tiles).
 *
 * The browser streams the tiles straight from tile.googleapis.com, so this key is public by
 * design (NEXT_PUBLIC_). Protect it in Google Cloud Console instead:
 * - Application restriction: HTTP referrers → https://miunidad360.com/*, http://localhost:3000/*
 * - API restriction: Map Tiles API only
 * - A daily quota cap on "Map Tiles API: root tileset requests" to bound the bill.
 * Without a key the selector shows its classic procedural city.
 */
export function geoApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return key && key.trim() !== "" ? key.trim() : null;
}

/**
 * Dev only: `?geo=preview` runs the atmosphere, clouds and flight over a plain ground, with
 * no Google requests. For tuning without a key; never in production builds.
 */
export const GEO_PREVIEW_KEY = "__preview__";
export function geoPreviewAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

let webgl2: boolean | null = null;

/** The atmosphere and clouds sample 3D textures: WebGL 2 only. */
export function supportsGeo(): boolean {
  if (webgl2 !== null) return webgl2;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webgl2 = gl != null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}
