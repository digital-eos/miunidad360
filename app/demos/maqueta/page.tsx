import type { Metadata } from "next";
import { Suspense } from "react";
import { MaquetaCanvas } from "@/components/three/demos/maqueta/MaquetaCanvas";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Maqueta 3D",
  description: "Recorré el edificio completo, torre por torre y piso por piso.",
};

export default function MaquetaDemoPage() {
  return (
    <main className="relative bg-background">
      <div className="relative">
        <MaquetaCanvas />
        <Suspense fallback={null}>
          <BackToHomeLink />
          <ScrollCue targetId="demo-cta" />
        </Suspense>
      </div>
      <DemoCTA demo="maqueta" />
      <Footer />
    </main>
  );
}
