import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

type Familia = {
  titulo: string;
  unidades: string;
  datos: [string, string, string];
  icono: ReactNode;
};

const ICON_PROPS = {
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-8 w-8",
  "aria-hidden": true,
};

const FAMILIAS: Familia[] = [
  {
    titulo: "Edificios",
    unidades: "Departamentos, cocheras, bauleras",
    datos: ["Piso", "m²", "Orientación"],
    icono: (
      <svg {...ICON_PROPS}>
        <rect x="8" y="4" width="16" height="24" rx="1" />
        <path d="M12 9h2M18 9h2M12 14h2M18 14h2M12 19h2M18 19h2M14 28v-4h4v4" />
      </svg>
    ),
  },
  {
    titulo: "Casas y condominios",
    unidades: "Casas, dúplex",
    datos: ["m² cubiertos", "Jardín", "Dormitorios"],
    icono: (
      <svg {...ICON_PROPS}>
        <path d="M4 15L16 5l12 10" />
        <path d="M7 13v14h18V13" />
        <path d="M13 27v-7h6v7" />
      </svg>
    ),
  },
  {
    titulo: "Barrios y loteos",
    unidades: "Lotes",
    datos: ["m²", "Frente × fondo", "Distancia a amenities"],
    icono: (
      <svg {...ICON_PROPS}>
        <rect x="4" y="6" width="24" height="20" rx="1" />
        <path d="M4 16h24M12 6v20M20 6v20" />
      </svg>
    ),
  },
  {
    titulo: "Campos",
    unidades: "Lotes y potreros",
    datos: ["Hectáreas", "Aptitud", "Accesos"],
    icono: (
      <svg {...ICON_PROPS}>
        <path d="M3 24c5-3 21-3 26 0" />
        <path d="M5 19c4-2 18-2 22 0" />
        <path d="M8 14c3-1.5 13-1.5 16 0" />
        <circle cx="23" cy="7" r="2.5" />
      </svg>
    ),
  },
  {
    titulo: "Oficinas y comercios",
    unidades: "Oficinas, locales",
    datos: ["m²", "Rubro", "Valor por m²"],
    icono: (
      <svg {...ICON_PROPS}>
        <path d="M5 12l2-6h18l2 6" />
        <path d="M5 12c0 2 2 3 3.7 3s3.6-1 3.6-3c0 2 1.9 3 3.7 3s3.7-1 3.7-3c0 2 1.8 3 3.6 3S27 14 27 12" />
        <path d="M7 15v12h18V15M13 27v-7h6v7" />
      </svg>
    ),
  },
  {
    titulo: "Parques industriales",
    unidades: "Lotes, naves",
    datos: ["m²", "Altura libre", "Potencia"],
    icono: (
      <svg {...ICON_PROPS}>
        <path d="M4 27V14l7 4v-4l7 4v-4l7 4V6h3v21z" />
        <path d="M9 23h3M15 23h3M21 23h3" />
      </svg>
    ),
  },
  {
    titulo: "Turismo",
    unidades: "Cabañas, unidades de renta",
    datos: ["m²", "Vista", "Estado"],
    icono: (
      <svg {...ICON_PROPS}>
        <path d="M5 17L15 8l10 9" />
        <path d="M8 15v12h14V15" />
        <path d="M13 27v-6h4v6" />
        <path d="M27 27v-7M27 20l-2.5 3M27 22l2-2.5" />
      </svg>
    ),
  },
];

export function UnitTypes() {
  return (
    <section
      id="unidades"
      className="scroll-mt-6 border-t border-border-subtle py-20 sm:py-24"
    >
      <Container>
        <SectionHeading title="Qué unidades podés mostrar" />
        <div role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FAMILIAS.map((f, index) => (
            <Reveal key={f.titulo} delay={index * 0.04} className="h-full">
              <div role="listitem" className="h-full rounded-2xl border border-border-subtle bg-background-elevated p-5 sm:p-6">
                <div className="text-accent-strong">{f.icono}</div>
                <h3 className="mt-4 font-display text-xl">{f.titulo}</h3>
                <p className="mt-1 text-sm text-foreground">{f.unidades}</p>
                <p className="mt-3 text-xs text-foreground-muted">{f.datos.join(" · ")}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-base text-foreground-muted">
          Si tu proyecto se divide en unidades, lo podemos mostrar así.
        </p>
      </Container>
    </section>
  );
}
