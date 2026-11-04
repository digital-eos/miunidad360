import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Simulador de sol",
  description: "Mostrá cómo entra la luz en cada unidad en distintos horarios.",
};

export default function SolDemoPage() {
  return (
    <ComingSoon
      eyebrow="Demo · Simulador de sol"
      title="El simulador de sol"
      description="Vas a poder ver cómo entra la luz en cada unidad según la hora del día y la época del año."
    />
  );
}
