import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const POINTS = [
  {
    title: "PDFs y renders fijos",
    description:
      "Tus compradores reciben el mismo plano estático que todos los demás desarrollos. Nada los diferencia de la competencia.",
  },
  {
    title: "Nadie se imagina viviendo ahí",
    description:
      "Una planta en 2D no transmite la luz, la vista ni la escala real de la unidad. El comprador duda y pide más tiempo.",
  },
  {
    title: "Contactos poco calificados",
    description:
      "Tu equipo de ventas atiende consultas genéricas en vez de hablar con compradores que ya eligieron una unidad puntual.",
  },
];

export function Problem() {
  return (
    <section className="border-t border-border-subtle py-24">
      <Container>
        <SectionHeading
          eyebrow="El problema"
          title="Vender en pozo todavía se hace con PDFs y renders fijos"
        />
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {POINTS.map((point, index) => (
            <Reveal key={point.title} delay={index * 0.08}>
              <div className="h-full rounded-2xl border border-border-subtle bg-background-elevated p-6 shadow-sm shadow-black/[0.04]">
                <span className="font-mono text-xs text-foreground-muted">
                  0{index + 1}
                </span>
                <h3 className="mt-4 font-display text-xl">{point.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  {point.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
