const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://miunidad360.com";

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
      "Departamentos, casas, lotes, locales o naves: tus clientes tocan una unidad en el 3D y ven su superficie, precio, disponibilidad, asoleamiento y avance de obra. Partimos de tus renders, planos o modelo BIM y te devolvemos un link para compartir.",
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
