import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The BIM demo moved to its project slug; keep old shared links working.
  async redirects() {
    return [
      // The demo catalogue lives at /demos, next to the demos themselves.
      { source: "/demo", destination: "/demos", permanent: false },
      { source: "/demos/bim", destination: "/demos/schependomlaan", permanent: true },
      // The selector lives under its project's shown name; keep older links working.
      { source: "/demos/selector", destination: "/demos/torre-aldrey", permanent: true },
      { source: "/demos/cataluna-ii", destination: "/demos/torre-aldrey", permanent: false },
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
