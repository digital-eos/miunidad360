"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
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
        href: "/demos/torre-aldrey",
        title: "Torre Aldrey",
        description:
          "El edificio en su ubicación real: filtrá por ambientes, precio y piso, y abrí la ficha de cada departamento.",
      },
      {
        kind: "zeus",
        href: "/demos/zeus3",
        title: "Zeus III · Pinamar",
        description:
          "Un edificio real armado en 3D desde sus planos: elegí un piso, tocá una unidad y mirá su plano, superficie y precio.",
      },
    ],
  },
  {
    titulo: "Departamentos",
    cards: [
      {
        kind: "departamento",
        href: "/demos/departamento",
        title: "Torre Aldrey · Unidad 103",
        description:
          "Un departamento real en 3D, generado desde el plano del folleto: tocá un ambiente y mirá sus medidas y renders.",
      },
    ],
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
  "group flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface transition-colors duration-150 hover:border-primary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** The demo catalogue: the whole content of the /demos page. */
export function Demos() {
  return (
    <section className="pt-12 pb-20 sm:pt-16 sm:pb-24">
      <Container>
        <h1 className="font-display text-4xl leading-tight text-balance sm:text-5xl">
          Demos por tipo de unidad
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground-muted">
          Abrí una demo y recorrela desde el navegador, igual que lo harían tus clientes.
        </p>

        <div className="mt-12 border-b border-border-subtle">
          {BLOQUES.map((bloque) => (
            <div
              key={bloque.titulo}
              className="grid gap-5 border-t border-border-subtle py-8 lg:grid-cols-[180px_1fr] lg:gap-10"
            >
              <h2 className="text-lg font-semibold">{bloque.titulo}</h2>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {bloque.cards.map((demo) => (
                  <Link
                    key={demo.kind}
                    href={demo.href}
                    onClick={() => trackDemoClick(demo.kind)}
                    className={cardClasses}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden border-b border-border-subtle bg-surface-muted">
                      <Image
                        src={`/images/demos/${demo.kind}.webp`}
                        alt={`Captura de la demo «${demo.title}»`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 330px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <p className="text-base font-semibold">{demo.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">
                        {demo.description}
                      </p>
                      <p className="mt-auto pt-4 text-sm font-semibold text-primary group-hover:underline group-hover:underline-offset-4">
                        Abrir demo <span aria-hidden="true">→</span>
                      </p>
                    </div>
                  </Link>
                ))}

                {bloque.proximamente ? (
                  <div
                    aria-disabled="true"
                    className="flex h-full flex-col rounded-lg border border-dashed border-border-strong p-4 sm:p-5"
                  >
                    <p className="label-caps text-foreground-subtle">Próximamente</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
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
