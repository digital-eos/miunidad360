import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Publicaciones } from "@/components/Publicaciones";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Publicaciones",
  description:
    "Propiedades en venta que podés recorrer en 3D: elegí una unidad y mirá su precio, su plano y su disponibilidad.",
};

export default function PublicacionesPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        <Publicaciones />
      </main>
      <Footer />
    </>
  );
}
