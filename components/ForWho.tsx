import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const AUDIENCES = [
  {
    title: "Promotores",
    description:
      "Vendé unidades desde el pozo con una experiencia que genera contactos calificados.",
  },
  {
    title: "Inmobiliarias",
    description:
      "Mostrales a tus clientes cada unidad disponible sin depender de un render fijo.",
  },
  {
    title: "Estudios de arquitectura",
    description:
      "Dale a tus proyectos una presentación a la altura del diseño que hicieron.",
  },
];

export function ForWho() {
  return (
    <section className="border-t border-border-subtle py-24">
      <Container>
        <SectionHeading
          eyebrow="Para quién"
          title="Pensado para quienes venden antes de construir"
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {AUDIENCES.map((audience, index) => (
            <Reveal key={audience.title} delay={index * 0.08}>
              <div className="h-full rounded-2xl border border-border-subtle p-6">
                <h3 className="font-display text-xl">{audience.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  {audience.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
