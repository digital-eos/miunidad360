import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Demos } from "@/components/Demos";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "Demos 3D por tipo de unidad: edificios, departamentos, lotes y galpones. Abrí una y recorrela desde el navegador.",
};

export default function DemosPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        <Demos />
      </main>
      <Footer />
    </>
  );
}
