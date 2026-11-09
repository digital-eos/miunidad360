import type { Metadata } from "next";
import { Suspense } from "react";
import { SelectorCanvas } from "@/components/three/demos/selector/SelectorCanvas";
import { CatalunaListingHeader } from "@/components/listing/CatalunaListingHeader";
import { ListingGallery, type ListingImage } from "@/components/listing/ListingGallery";
import { Container } from "@/components/ui/Container";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";
import { CATALUNA_SLUG } from "@/lib/three/cataluna-ii";

export const metadata: Metadata = {
  title: "Cataluña II · Mar del Plata",
  description:
    "Cataluña II en Buenos Aires 2771, Mar del Plata: elegí una unidad y mirá al instante su disponibilidad y precio.",
};

const FOTOS = "/projects/cataluna-ii/fotos";

/** Every render of the project from the developer's brochure. */
const GALERIA: ListingImage[] = [
  { src: `${FOTOS}/edificio-fachada.webp`, alt: "Fachada de Cataluña II de noche" },
  { src: `${FOTOS}/edificio-hall.webp`, alt: "Hall de entrada" },
  { src: `${FOTOS}/edificio-quincho.webp`, alt: "Quincho común" },
  { src: `${FOTOS}/edificio-terraza.webp`, alt: "Terraza con solárium" },
  { src: `${FOTOS}/estar-1.webp`, alt: "Estar" },
  { src: `${FOTOS}/estar-2.webp`, alt: "Estar, otra vista" },
  { src: `${FOTOS}/comedor-1.webp`, alt: "Comedor" },
  { src: `${FOTOS}/cocina-1.webp`, alt: "Cocina" },
  { src: `${FOTOS}/cocina-2.webp`, alt: "Cocina, otra vista" },
  { src: `${FOTOS}/cocina-3.webp`, alt: "Cocina, detalle" },
  { src: `${FOTOS}/dormitorio-1.webp`, alt: "Dormitorio" },
  { src: `${FOTOS}/dormitorio-2.webp`, alt: "Dormitorio, otra vista" },
  { src: `${FOTOS}/bano-1.webp`, alt: "Baño" },
];

export default function SelectorDemoPage() {
  return (
    <main className="relative bg-background">
      <CatalunaListingHeader />
      <Container className="max-w-[1400px]">
        <Suspense fallback={null}>
          <SelectorCanvas projectSlug={CATALUNA_SLUG} />
        </Suspense>
      </Container>
      <ListingGallery images={GALERIA} title="Cataluña II en imágenes" />
      <DemoCTA demo="selector" />
      <Footer />
    </main>
  );
}
