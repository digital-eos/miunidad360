import type { Metadata } from "next";
import { Suspense } from "react";
import { ZeusCanvas } from "@/components/three/demos/zeus/ZeusCanvas";
import { ZeusGallery } from "@/components/three/demos/zeus/ZeusGallery";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Zeus III · Pinamar",
  description:
    "Recorré Zeus III en 3D: elegí un piso, tocá una unidad y mirá su plano, superficie y precio. Más la galería de renders del proyecto.",
  // Renders and plans belong to the architects: keep the page out of search engines (and out
  // of the sitemap) until they agree to a public demo.
  robots: { index: false, follow: false },
};

export default function ZeusDemoPage() {
  return (
    <main className="relative bg-background">
      <Suspense fallback={null}>
        <ZeusCanvas>
          <BackToHomeLink />
          <ScrollCue targetId="galeria" />
        </ZeusCanvas>
      </Suspense>
      <ZeusGallery />
      <DemoCTA demo="zeus" />
      <Footer />
    </main>
  );
}
