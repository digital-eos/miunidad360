const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://miunidad360.com.ar";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Digital EOS",
    url: siteUrl,
    sameAs: [] as string[],
    brand: {
      "@type": "Brand",
      name: "MiUnidad360",
    },
  };
}

export function productJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "MiUnidad360",
    description:
      "Experiencias 3D interactivas para que tus compradores exploren el edificio, elijan su unidad y vean disponibilidad, precio y sol en tiempo real.",
    brand: {
      "@type": "Brand",
      name: "MiUnidad360",
    },
    manufacturer: {
      "@type": "Organization",
      name: "Digital EOS",
    },
    url: siteUrl,
    image: `${siteUrl}/opengraph-image`,
    audience: {
      "@type": "Audience",
      audienceType: "Promotores inmobiliarios, inmobiliarias y estudios de arquitectura",
    },
  };
}
