import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/brand/Logo";
import { GaleriaEditorial } from "./GaleriaEditorial";
import { PlantasInteractivas } from "./PlantasInteractivas";
import { PortadaCinematica } from "./PortadaCinematica";
import {
  CASA_CITRA_AUTOR,
  DATOS_CASA_CITRA,
  FOTOS_CASA_CITRA,
  PLANOS_PDF,
  PLANTAS,
  PORTADA_CASA_CITRA,
} from "@/lib/proyectos/casa-citra";

/** /proyectos/casa-citra: the architect's presentation of the house, renders first. */
export function CasaCitra() {
  return (
    <main className="bg-background">
      <PortadaCinematica
        fotos={PORTADA_CASA_CITRA}
        arriba={
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="font-medium tracking-wide text-white/90">{CASA_CITRA_AUTOR}</p>
            <a href="#galeria" className="text-white/80 transition-colors hover:text-white">
              Galería ↓
            </a>
          </div>
        }
      >
        <p className="label-caps text-white/70">Vivienda unifamiliar · Villa Gesell, Buenos Aires</p>
        <h1 className="mt-2 font-display text-5xl leading-none sm:text-7xl lg:text-8xl">Casa Citra</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
          Una caja blanca sobre pilotes, entre los pinos: la casa se levanta del suelo, deja
          pasar el bosque por debajo y termina en una terraza mirador sobre las copas.
        </p>
      </PortadaCinematica>

      <section className="border-b border-border-subtle bg-surface">
        <Container className="max-w-[1400px]">
          <dl className="grid grid-cols-2 divide-border-subtle sm:grid-cols-4 sm:divide-x">
            {DATOS_CASA_CITRA.map((d) => (
              <div key={d.etiqueta} className="flex flex-col-reverse px-1 py-6 sm:px-6 sm:first:pl-0">
                <dt className="label-caps mt-1 text-foreground-subtle">{d.etiqueta}</dt>
                <dd className="font-display text-3xl tabular-nums sm:text-4xl">{d.valor}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section id="galeria" className="py-16 sm:py-24">
        <Container className="max-w-[1400px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
            <div>
              <p className="eyebrow">Galería</p>
              <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">La casa en imágenes</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-foreground-muted">
              {FOTOS_CASA_CITRA.length} imágenes. Tocá una para verla en pantalla completa y
              deslizá para pasar a la siguiente.
            </p>
          </div>
          <GaleriaEditorial fotos={FOTOS_CASA_CITRA} />
        </Container>
      </section>

      <section id="plantas" className="border-t border-border-subtle bg-surface py-16 sm:py-24">
        <Container className="max-w-[1400px]">
          <div className="mb-8 grid gap-6 sm:mb-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
            <div>
              <p className="eyebrow">Plantas</p>
              <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
                Tres niveles, del bosque al cielo
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground-muted">
                En planta baja, el estudio y un dormitorio dentro de un volumen curvo de madera,
                con la cochera bajo los pilotes. Arriba, el estar abierto a la terraza y la
                suite. En el techo, la terraza mirador y el quincho.
              </p>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <p className="label-caps text-foreground-subtle">Planos originales (PDF)</p>
              {PLANOS_PDF.map((p) => (
                <a
                  key={p.href}
                  href={p.href}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-secondary btn-sm justify-between"
                >
                  {p.nombre}
                  <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
          </div>
          <PlantasInteractivas plantas={PLANTAS} />
        </Container>
      </section>

      <footer className="bg-[#141716] py-12 text-white/70">
        <Container className="flex max-w-[1400px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps text-white/50">Proyecto</p>
            <p className="mt-2 font-display text-2xl text-white">{CASA_CITRA_AUTOR}</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-white/50">
              Imágenes ilustrativas: los renders muestran la idea del proyecto y pueden diferir
              de la obra terminada.
            </p>
          </div>
          <Link href="/" className="flex items-center gap-3 text-xs text-white/50 transition-colors hover:text-white">
            Presentado con
            <Logo tone="dark" className="h-5" />
          </Link>
        </Container>
      </footer>
    </main>
  );
}
