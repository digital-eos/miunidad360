import type { Metadata } from "next";
import { DepartamentoCanvas } from "@/components/three/demos/departamento/DepartamentoCanvas";
import { BackToHomeLink } from "@/components/capture/BackToHomeLink";
import { ScrollCue } from "@/components/ScrollCue";
import { DemoCTA } from "@/components/DemoCTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Departamento en 3D",
  description:
    "Un departamento real en 3D, generado desde el plano de su folleto de venta: recorré sus ambientes, medidas y renders.",
};

export default function DepartamentoDemoPage() {
  return (
    <main className="relative bg-background">
      <DepartamentoCanvas>
        <BackToHomeLink />
        <ScrollCue targetId="demo-cta" />
      </DepartamentoCanvas>
      <DemoCTA demo="departamento" />
      <Footer />
    </main>
  );
}
