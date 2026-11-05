import type { Metadata } from "next";
import { Suspense } from "react";
import { BimCanvas } from "@/components/three/demos/bim/BimCanvas";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Modelo BIM",
  description:
    "Explorá el edificio por unidades, avance de obra y corte, sobre un modelo BIM real con datos de construcción.",
};

export default function BimDemoPage() {
  return (
    <main className="relative bg-background">
      <Suspense fallback={null}>
        <BimCanvas>
          <BackToHomeLink />
          <ScrollCue targetId="demo-cta" />
        </BimCanvas>
      </Suspense>
      <DemoCTA demo="bim" />
      <Footer />
    </main>
  );
}
