import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

type Audience = {
  title: string;
  benefit: string;
  link: { href: string; label: string };
};

const AUDIENCES: Audience[] = [
  {
    title: "Desarrolladoras",
    benefit:
      "Mostrá cada unidad de tu edificio en pozo con su precio y su estado, y recibí consultas de compradores que ya eligieron qué unidad quieren.",
    link: { href: "/demos/torre-aldrey", label: "Ver la demo de edificio" },
  },
  {
    title: "Loteos y barrios",
    benefit:
      "Tus compradores recorren el barrio, filtran lotes por superficie y precio, y te consultan por el lote que les interesa.",
    link: { href: "/demos/lotes", label: "Ver la demo de loteo" },
  },
  {
    title: "Estudios de arquitectura y render",
    benefit:
      "Sumá la versión interactiva a tu oferta: armamos el 3D a partir de tus renders o tu modelo y se lo entregás a tu cliente con tu marca, sin la nuestra.",
    link: { href: "#contacto", label: "Consultanos" },
  },
];

/** Who the product is for: one benefit per audience. */
export function ForWhom() {
  return (
    <section id="para-quien" className="border-t border-border-subtle py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Para quién" title="Pensado para quien vende unidades antes de construirlas" />

        <ul className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <li
              key={audience.title}
              className="flex flex-col rounded-lg border border-border-subtle bg-surface p-5 sm:p-6"
            >
              <h3 className="text-lg font-semibold leading-tight">{audience.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {audience.benefit}
              </p>
              <Link
                href={audience.link.href}
                className="mt-auto pt-4 text-sm font-semibold text-primary hover:underline hover:underline-offset-4"
              >
                {audience.link.label} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
