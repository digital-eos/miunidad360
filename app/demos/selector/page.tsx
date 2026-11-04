import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Selector de unidades",
  description: "Elegí una unidad y mirá al instante su disponibilidad y precio.",
};

export default function SelectorDemoPage() {
  return (
    <ComingSoon
      eyebrow="Demo · Selector de unidades"
      title="El selector de unidades"
      description="Vas a poder elegir piso y unidad, y ver al instante disponibilidad, precio y superficie."
    />
  );
}
