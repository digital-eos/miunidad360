import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Maqueta 3D",
  description: "Recorré el edificio completo, torre por torre y piso por piso.",
};

export default function MaquetaDemoPage() {
  return (
    <ComingSoon
      eyebrow="Demo · Maqueta 3D"
      title="La maqueta 3D interactiva"
      description="Vas a poder recorrer el edificio completo, entrar a cada torre y ver el proyecto desde cualquier ángulo."
    />
  );
}
