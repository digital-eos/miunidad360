import type { Metadata } from "next";
import Link from "next/link";
import { SelectorCanvas } from "@/components/three/demos/selector/SelectorCanvas";

export const metadata: Metadata = {
  title: "Selector de unidades",
  description: "Elegí una unidad y mirá al instante su disponibilidad y precio.",
};

export default function SelectorDemoPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <SelectorCanvas projectSlug="edificio-demo" />
      <Link
        href="/"
        className="absolute left-4 top-20 z-10 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent sm:left-6 sm:top-24 sm:text-sm"
      >
        ← Volver al inicio
      </Link>
    </main>
  );
}
