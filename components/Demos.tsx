"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { trackDemoClick, type DemoKind } from "@/lib/analytics";
import { BIM_DEMO_PATH } from "@/lib/bim/route";
import { featuredProject } from "@/config/featured";

type DemoCard = {
  kind: DemoKind;
  href: string;
  title: string;
  description: string;
};

type Bloque = {
  titulo: string;
  cards: DemoCard[];
  proximamente?: string;
};

const BLOQUES: Bloque[] = [
  {
    titulo: "Edificios",
    cards: [
      {
        kind: "bim",
        href: BIM_DEMO_PATH,
        title: featuredProject.nombre,
        description:
          "Un modelo de arquitectura real: tocá una unidad, cortalo por piso o mirá el avance de obra.",
      },
      {
        kind: "selector",
        href: "/demos/selector",
        title: "Edificio demo",
        description: "Filtrá por ambientes, precio y piso, y abrí la ficha de cada departamento.",
      },
    ],
  },
  {
    titulo: "Departamentos",
    cards: [],
    proximamente:
      "Una demo centrada en un solo departamento: recorrido por sus ambientes, plano y vistas.",
  },
  {
    titulo: "Lotes",
    cards: [
      {
        kind: "lotes",
        href: "/demos/lotes",
        title: "Barrio demo",
        description:
          "Un barrio cerrado con laguna y amenities: filtrá lotes por superficie y precio, y consultá por uno.",
      },
    ],
  },
  {
    titulo: "Hoteles & SPA",
    cards: [],
    proximamente:
      "Una demo para hoteles y spas: habitaciones y suites con su disponibilidad, y los amenities.",
  },
];

const cardClasses =
  "group block h-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_16px_36px_-20px_rgba(28,28,28,0.35)] focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function Demos() {
  return (
    <section
      id="demos"
      className="scroll-mt-6 border-t border-border-subtle py-20 sm:py-24"
    >
      <Container>
        <SectionHeading title="Demos por tipo de unidad" />

        <div className="mt-10 space-y-14">
          {BLOQUES.map((bloque) => (
            <div key={bloque.titulo}>
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-accent-strong">
                {bloque.titulo}
              </h3>

              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                {bloque.cards.map((demo, index) => (
                  <Reveal key={demo.kind} delay={index * 0.06}>
                    <Link
                      href={demo.href}
                      onClick={() => trackDemoClick(demo.kind)}
                      className={cardClasses}
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
                        <p className="font-display text-xl">{demo.title}</p>
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

                {bloque.proximamente ? (
                  <div
                    aria-disabled="true"
                    className="flex h-full min-h-40 flex-col justify-between rounded-2xl border border-dashed border-border-subtle p-5 sm:p-6"
                  >
                    <p className="w-fit rounded-full border border-border-subtle px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
                      Próximamente
                    </p>
                    <p className="mt-6 text-sm leading-relaxed text-foreground-muted">
                      {bloque.proximamente}
                    </p>
                  </div>
                ) : null}
              </div>

            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
