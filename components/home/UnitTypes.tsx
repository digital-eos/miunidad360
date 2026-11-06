import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";

// Rendered card width per breakpoint: Container is max-w-6xl with px-6 / sm:px-8, gap-4.
const IMAGE_SIZES =
  "(min-width: 1152px) 352px, (min-width: 1024px) calc((100vw - 96px) / 3), (min-width: 640px) calc((100vw - 80px) / 2), calc(100vw - 48px)";

type Familia = {
  titulo: string;
  /** Base name of the files in public/images/unidades/ */
  imagen: string;
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
    imagen: "edificios",
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
    imagen: "casas-y-condominios",
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
    imagen: "barrios-y-loteos",
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
    imagen: "campos",
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
    imagen: "oficinas-y-comercios",
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
    imagen: "parques-industriales",
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
    imagen: "turismo",
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
              <div role="listitem" className="group flex h-full flex-col rounded-2xl border border-border-subtle bg-background-elevated">
                <div className="aspect-[4/3] overflow-hidden rounded-t-[calc(1rem-1px)] bg-[#F4F2EC]">
                  <img
                    src={`/images/unidades/${f.imagen}.webp`}
                    srcSet={`/images/unidades/${f.imagen}-600.webp 600w, /images/unidades/${f.imagen}.webp 1200w`}
                    sizes={IMAGE_SIZES}
                    alt={`Maqueta de ${f.titulo.toLowerCase()} con unidades coloreadas según su estado`}
                    width={1200}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex-1 p-5 sm:p-6">
                  <div className="text-accent-strong">{f.icono}</div>
                  <h3 className="mt-4 font-display text-xl">{f.titulo}</h3>
                  <p className="mt-1 text-sm text-foreground">{f.unidades}</p>
                  <p className="mt-3 text-xs text-foreground-muted">{f.datos.join(" · ")}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <ul
          aria-label="Referencia de colores"
          className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground-muted"
        >
          {STATUS_ORDER.map((status) => (
            <li key={status} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              {STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-base text-foreground-muted">
          Si tu proyecto se divide en unidades, lo podemos mostrar así.
        </p>
      </Container>
    </section>
  );
}
