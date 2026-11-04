import type { Metadata } from "next";
import { Suspense } from "react";
import { SolCanvas } from "@/components/three/demos/sol/SolCanvas";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Estudio de asoleamiento",
  description: "Mostrá cómo entra el sol en cada unidad según la hora y la época del año.",
};

export default function SolDemoPage() {
  return (
    <main className="relative bg-background">
      <div className="relative">
        <SolCanvas projectSlug="edificio-demo" />
        <Suspense fallback={null}>
          <BackToHomeLink />
          <ScrollCue targetId="demo-cta" />
        </Suspense>
      </div>
      <DemoCTA demo="sol" />
      <Footer />
    </main>
  );
}
