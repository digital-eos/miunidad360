"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { DemoPreview } from "@/components/DemoPreview";
import { trackDemoClick } from "@/lib/analytics";

const DEMOS = [
  {
    kind: "maqueta" as const,
    href: "/demos/maqueta",
    title: "Maqueta 3D",
    description: "Recorré el edificio completo, torre por torre y piso por piso.",
  },
  {
    kind: "selector" as const,
    href: "/demos/selector",
    title: "Selector de unidades",
    description: "Elegí una unidad y mirá al instante su disponibilidad y precio.",
  },
  {
    kind: "sol" as const,
    href: "/demos/sol",
    title: "Estudio de asoleamiento",
    description: "Mostrá cómo entra el sol en cada unidad según la hora y la época del año.",
  },
];

export function Demos() {
  return (
    <section id="demos" className="border-t border-border-subtle py-24">
      <Container>
        <SectionHeading eyebrow="Las demos" title="Mirá cómo lo vive tu comprador" />
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {DEMOS.map((demo, index) => (
            <Reveal key={demo.kind} delay={index * 0.08}>
              <Link
                href={demo.href}
                onClick={() => trackDemoClick(demo.kind)}
                className="group block h-full rounded-2xl border border-border-subtle bg-background p-5 shadow-sm shadow-black/[0.04] transition-colors duration-200 hover:border-accent"
              >
                <DemoPreview kind={demo.kind} />
                <h3 className="mt-5 font-display text-xl">{demo.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                  {demo.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-strong">
                  Ver demo
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
