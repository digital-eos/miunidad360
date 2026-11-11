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
      "Recorridos 3D interactivos para vender unidades en pozo: tus compradores tocan una unidad y ven su superficie, precio y disponibilidad, y te consultan por WhatsApp. Partimos de tus planos, renders o modelo 3D; cada proyecto tiene su link privado, con contraseña opcional.",
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
      audienceType: "Desarrolladoras, loteos y barrios, estudios de arquitectura y render",
    },
  };
}
