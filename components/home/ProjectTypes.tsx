import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

type ProjectType = {
  /** Anchor of its block in /demos. */
  id: string;
  title: string;
  /** What "the unit" is for this kind of project. */
  unit: string;
  image: string;
  alt: string;
  comingSoon?: boolean;
};

const TYPES: ProjectType[] = [
  {
    id: "edificios",
    title: "Edificios",
    unit: "Cada departamento, por piso, con su precio y su estado.",
    image: "selector",
    alt: "Un edificio en 3D sobre el mapa de su barrio",
  },
  {
    id: "departamentos",
    title: "Departamentos",
    unit: "El interior de una unidad: cada ambiente con sus medidas.",
    image: "departamento",
    alt: "Un departamento en 3D visto desde arriba, con sus ambientes",
  },
  {
    id: "lotes",
    title: "Lotes",
    unit: "Barrios y loteos: cada lote con su superficie y su precio.",
    image: "lotes",
    alt: "Un barrio cerrado en 3D con los lotes pintados según su disponibilidad",
  },
  {
    id: "galpones",
    title: "Galpones",
    unit: "Parques industriales y logísticos: cada nave con sus metros.",
    image: "galpones",
    alt: "Un parque de galpones en 3D con cada nave pintada según su disponibilidad",
    comingSoon: true,
  },
];

/** The kinds of project we build in 3D, each linking to its block of the demo catalogue. */
export function ProjectTypes() {
  return (
    <section id="tipos" className="border-t border-border-subtle py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Tipos de 3D"
          title="Un 3D distinto para cada tipo de proyecto"
          description="No hacemos un solo modelo: armamos el 3D que tu proyecto necesita, y en todos tu cliente toca una unidad y ve sus datos."
        />

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {TYPES.map((type) => (
            <li key={type.id}>
              <Link
                href={`/demos#${type.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface transition-colors duration-150 hover:border-primary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="relative aspect-[16/10] overflow-hidden border-b border-border-subtle bg-surface-muted">
                  <Image
                    src={`/images/demos/${type.image}.webp`}
                    alt={type.alt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 270px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
                    {type.title}
                    {type.comingSoon ? (
                      <span className="label-caps text-foreground-subtle">Próximamente</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
                    {type.unit}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-foreground-muted">
          También casas y locales. Y estamos preparando una demo para hoteles y spas.{" "}
          <Link
            href="/demos"
            className="font-semibold text-primary hover:underline hover:underline-offset-4"
          >
            Ver todas las demos <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Container>
    </section>
  );
}
