import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const BENEFITS = [
  {
    title: "El comprador explora y elige solo",
    description:
      "Recorre el edificio en 3D, entra a cada unidad y compara pisos y vistas sin esperar a que alguien le mande un PDF.",
  },
  {
    title: "Contactos ya calificados por unidad",
    description:
      "Cada consulta llega con la unidad exacta que le interesó: tu equipo de ventas habla directamente de precio y cierre.",
  },
  {
    title: "Disponibilidad actualizada en tiempo real",
    description:
      "Marcá una unidad como vendida o reservada y el cambio se refleja al instante para todos los que están mirando el edificio.",
  },
];

export function Solution() {
  return (
    <section className="border-t border-border-subtle bg-background-elevated py-24">
      <Container>
        <SectionHeading
          eyebrow="La solución"
          title="Una experiencia 3D que vende por vos, las 24 horas"
        />
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {BENEFITS.map((benefit, index) => (
            <Reveal key={benefit.title} delay={index * 0.08}>
              <div className="h-full rounded-2xl border border-border-subtle bg-background p-6 shadow-sm shadow-black/[0.04]">
                <div className="h-1 w-10 rounded-full bg-accent" />
                <h3 className="mt-5 font-display text-xl">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  {benefit.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
