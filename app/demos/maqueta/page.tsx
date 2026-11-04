import type { Metadata } from "next";
import Link from "next/link";
import { MaquetaCanvas } from "@/components/three/demos/maqueta/MaquetaCanvas";

export const metadata: Metadata = {
  title: "Maqueta 3D",
  description: "Recorré el edificio completo, torre por torre y piso por piso.",
};

export default function MaquetaDemoPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <MaquetaCanvas />
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent sm:left-6 sm:top-6 sm:text-sm"
      >
        ← Volver al inicio
      </Link>
    </main>
  );
}
