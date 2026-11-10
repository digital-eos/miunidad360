import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ResultSlideshow } from "@/components/home/ResultSlideshow";

const BASE = "/projects/cataluna-ii";

/** Sample of the sheet a developer sends; same figures as the Cataluña II demo. */
const SHEET_ROWS = [
  { code: "102", area: "37 m²", price: "82.000", state: "Disponible" },
  { code: "103", area: "39 m²", price: "86.000", state: "Disponible" },
  { code: "203", area: "45 m²", price: "98.000", state: "Reservada" },
];

const CHANNELS = ["WhatsApp", "Tu sitio web", "QR en la obra"];

const visualClass =
  "relative aspect-[4/3] overflow-hidden rounded-lg border border-border-subtle bg-surface-muted";

/** What you send: a unit plan and the units sheet. */
function InputVisual() {
  return (
    <div className={visualClass}>
      {/* Absolute, so the tall plan takes the frame's height instead of stretching it. */}
      <div className="absolute inset-0 flex items-center gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE}/plano-103.webp`}
          alt="Plano de la unidad 103 de Torre Aldrey"
          width={1091}
          height={1987}
          loading="lazy"
          decoding="async"
          className="h-full w-auto shrink-0 rounded-sm border border-border-subtle bg-surface"
        />
        <table className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface text-[11px] tabular-nums">
          <thead>
            <tr className="border-b border-border-subtle text-left text-foreground-subtle">
              <th className="px-2 py-1.5 font-medium">Unidad</th>
              <th className="px-2 py-1.5 font-medium">USD</th>
              <th className="hidden px-2 py-1.5 font-medium min-[480px]:table-cell md:hidden">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {SHEET_ROWS.map((row) => (
              <tr
                key={row.code}
                className="border-b border-border-subtle last:border-b-0"
              >
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <span className="font-medium">{row.code}</span>
                  <span className="text-foreground-muted"> · {row.area}</span>
                </td>
                <td className="px-2 py-1.5">{row.price}</td>
                <td className="hidden px-2 py-1.5 text-foreground-muted min-[480px]:table-cell md:hidden">
                  {row.state}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** What we build: the unit answering with its data inside the 3D view. */
function BuildVisual() {
  return (
    <div className={visualClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${BASE}/como-funciona/detalle-etiqueta.webp`}
        alt="Detalle del 3D: la unidad 402 muestra su precio y que está disponible"
        width={800}
        height={600}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/** How you get it: the unit sheet on a phone, and the three ways to share the link. */
function DeliveryVisual() {
  return (
    <div className={visualClass}>
      <div className="absolute inset-0 flex items-start justify-center gap-4 px-4 pt-5">
        <ul className="flex flex-col gap-2 self-center">
          {CHANNELS.map((channel) => (
            <li
              key={channel}
              className="rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
            >
              {channel}
            </li>
          ))}
        </ul>
        <div className="w-[42%] max-w-[170px] shrink-0 overflow-hidden rounded-t-[1.25rem] border-[5px] border-b-0 border-foreground bg-surface shadow-[var(--shadow-panel)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE}/como-funciona/telefono-ficha.webp`}
            alt="La ficha de la unidad 103 abierta en un celular, con el botón para consultar por WhatsApp"
            width={600}
            height={1067}
            loading="lazy"
            decoding="async"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

const STEPS: { title: string; description: string; visual: ReactNode }[] = [
  {
    title: "Nos mandás planos y datos",
    description:
      "El plano de cada unidad y una planilla con su superficie, su precio y su estado. Nada más.",
    visual: <InputVisual />,
  },
  {
    title: "Armamos tu proyecto en 3D",
    description:
      "Cada unidad queda conectada a sus datos: tu cliente la toca y ve su precio, su plano y su disponibilidad.",
    visual: <BuildVisual />,
  },
  {
    title: "Lo recibís como un link",
    description:
      "Lo mandás por WhatsApp, lo sumás a la web del proyecto o lo ponés en un QR en el cartel de obra.",
    visual: <DeliveryVisual />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-t border-border-subtle py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Cómo funciona"
          title="De tus planos a un link que tus clientes recorren"
          description="Vos nos pasás los planos y los datos de cada unidad. Nosotros armamos tu proyecto en 3D, sea un edificio, un loteo o un parque de galpones, y te lo entregamos listo para compartir."
        />

        <div className="mt-10">
          <ResultSlideshow />
        </div>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              {step.visual}
              <span className="mt-5 block label-caps tabular-nums text-foreground-subtle">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 text-lg font-semibold leading-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-xs leading-relaxed text-foreground-muted/80">
          Capturas de la demo Torre Aldrey. Precios y estados ficticios.
        </p>

        <div className="mt-6">
          <a href="#resultado" className="btn btn-secondary">
            Recorrer en 3D ↓
          </a>
        </div>
      </Container>
    </section>
  );
}
