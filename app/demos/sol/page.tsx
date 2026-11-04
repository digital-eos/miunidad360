import type { Metadata } from "next";
import Link from "next/link";
import { SolCanvas } from "@/components/three/demos/sol/SolCanvas";

export const metadata: Metadata = {
  title: "Estudio de asoleamiento",
  description: "Mostrá cómo entra el sol en cada unidad según la hora y la época del año.",
};

export default function SolDemoPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <SolCanvas projectSlug="edificio-demo" />
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent sm:left-6 sm:top-6 sm:text-sm"
      >
        ← Volver al inicio
      </Link>
    </main>
  );
}
