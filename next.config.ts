import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The BIM demo moved to its project slug; keep old shared links working.
  async redirects() {
    return [
      { source: "/demos/bim", destination: "/demos/schependomlaan", permanent: true },
      // The selector now lives under its project name (Cataluña II, Cataluña Edificios).
      { source: "/demos/selector", destination: "/demos/cataluna-ii", permanent: true },
    ];
  },
  // Atmosphere tables, cloud and noise textures, Draco decoder (~12 MB, pinned to library
  // versions): cache them so the real-location selector loads fast on return visits.
  async headers() {
    return [
      {
        source: "/geo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
