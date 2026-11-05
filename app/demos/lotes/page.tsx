import type { Metadata } from "next";
import { Suspense } from "react";
import { LotesCanvas } from "@/components/three/demos/lotes/LotesCanvas";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Barrio demo",
  description:
    "Un barrio cerrado ficticio en 3D: tocá un lote y mirá su superficie, frente, fondo, precio y disponibilidad. Filtrá por superficie, precio y frente a la laguna.",
};

export default function LotesDemoPage() {
  return (
    <main className="relative bg-background">
      <LotesCanvas>
        <Suspense fallback={null}>
          <BackToHomeLink />
          <ScrollCue targetId="demo-cta" />
        </Suspense>
      </LotesCanvas>
      <DemoCTA demo="lotes" />
      <Footer />
    </main>
  );
}
