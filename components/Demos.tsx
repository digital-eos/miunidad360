"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { trackDemoClick } from "@/lib/analytics";

const DEMOS = [
  {
    kind: "bim" as const,
    href: "/demos/bim",
    title: "Proyecto BIM real",
    description:
      "Un modelo de arquitectura real, con unidades, cortes y cronograma de obra.",
  },
  {
    kind: "maqueta" as const,
    href: "/demos/maqueta",
    title: "Maqueta 3D",
    description: "Recorré el edificio de día y de noche, desde el aire o desde la calle.",
  },
  {
    kind: "selector" as const,
    href: "/demos/selector",
    title: "Selector de unidades",
    description: "Filtrá por ambientes, precio y piso, y consultá por una unidad.",
  },
  {
    kind: "sol" as const,
    href: "/demos/sol",
    title: "Estudio de asoleamiento",
    description: "Mirá cuántas horas de sol recibe cada unidad según la época del año.",
  },
];

export function Demos() {
  return (
    <section
      id="demos"
      className="scroll-mt-6 border-t border-border-subtle py-20 sm:py-24"
    >
      <Container>
        <SectionHeading title="Explorá otras experiencias" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {DEMOS.map((demo, index) => (
            <Reveal key={demo.kind} delay={index * 0.06}>
              <Link
                href={demo.href}
                onClick={() => trackDemoClick(demo.kind)}
                className="group block h-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_16px_36px_-20px_rgba(28,28,28,0.35)] focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-background">
                  <Image
                    src={`/images/demos/${demo.kind}.webp`}
                    alt={`Captura de la demo «${demo.title}»`}
                    fill
                    sizes="(max-width: 640px) 100vw, 560px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="font-display text-xl">{demo.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                    {demo.description}
                  </p>
                  <p className="mt-4 text-sm font-medium text-accent-strong">
                    Abrir demo{" "}
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
