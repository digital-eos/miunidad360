import type { Metadata } from "next";
import { Suspense } from "react";
import { SelectorCanvas } from "@/components/three/demos/selector/SelectorCanvas";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";
import { CATALUNA_SLUG } from "@/lib/three/cataluna-ii";

export const metadata: Metadata = {
  title: "Cataluña II · Mar del Plata",
  description:
    "Cataluña II en Buenos Aires 2771, Mar del Plata: elegí una unidad y mirá al instante su disponibilidad y precio.",
};

export default function SelectorDemoPage() {
  return (
    <main className="relative bg-background">
      <Suspense fallback={null}>
        <SelectorCanvas projectSlug={CATALUNA_SLUG}>
          <BackToHomeLink />
          <ScrollCue targetId="demo-cta" />
        </SelectorCanvas>
      </Suspense>
      <DemoCTA demo="selector" />
      <Footer />
    </main>
  );
}
