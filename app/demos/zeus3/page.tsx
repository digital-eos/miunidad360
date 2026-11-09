import type { Metadata } from "next";
import { Suspense } from "react";
import { ZeusCanvas } from "@/components/three/demos/zeus/ZeusCanvas";
import { ListingHeader } from "@/components/listing/ListingHeader";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { Container } from "@/components/ui/Container";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";
import { zeusData } from "@/lib/zeus/dataset";
import { formatPrecio } from "@/lib/unidades/format";

export const metadata: Metadata = {
  title: "Zeus III · Pinamar",
  description:
    "Recorré Zeus III en 3D: elegí un piso, tocá una unidad y mirá su plano, superficie y precio. Más la galería de renders del proyecto.",
  // Renders and plans belong to the architects: keep the page out of search engines (and out
  // of the sitemap) until they agree to a public demo.
  robots: { index: false, follow: false },
};

export default function ZeusDemoPage() {
  const { proyecto, unidades, cocheras, niveles, galeria } = zeusData;
  const available = unidades.filter((u) => u.estado === "disponible");
  const prices = available.flatMap((u) => (u.precio != null ? [u.precio] : []));
  const minPrice = prices.length ? Math.min(...prices) : null;

  return (
    <main className="relative bg-background">
      <ListingHeader
        eyebrow="Departamentos en venta"
        title={proyecto.nombre}
        location={`${proyecto.ubicacion} · ${proyecto.estudio}`}
        priceLabel={minPrice != null ? formatPrecio(minPrice, proyecto.moneda) : null}
        description={proyecto.descripcion}
        stats={[
          { label: "Unidades", value: String(unidades.length) },
          { label: "Disponibles", value: String(available.length) },
          { label: "Niveles", value: String(niveles.length) },
          { label: "Cocheras", value: String(cocheras.length) },
        ]}
      />
      <Container className="max-w-[1400px]">
        <Suspense fallback={null}>
          <ZeusCanvas />
        </Suspense>
      </Container>
      <ListingGallery
        images={galeria}
        title={`${proyecto.nombre} en imágenes`}
        credit={proyecto.estudio}
      />
      <DemoCTA demo="zeus" />
      <Footer />
    </main>
  );
}
