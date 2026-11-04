import type { Metadata } from "next";
import { Suspense } from "react";
import { SelectorCanvas } from "@/components/three/demos/selector/SelectorCanvas";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Selector de unidades",
  description: "Elegí una unidad y mirá al instante su disponibilidad y precio.",
};

export default function SelectorDemoPage() {
  return (
    <main className="relative bg-background">
      <div className="relative">
        <SelectorCanvas projectSlug="edificio-demo" />
        <Suspense fallback={null}>
          <BackToHomeLink className="top-20 sm:top-24" />
          <ScrollCue targetId="demo-cta" />
        </Suspense>
      </div>
      <DemoCTA demo="selector" />
      <Footer />
    </main>
  );
}
