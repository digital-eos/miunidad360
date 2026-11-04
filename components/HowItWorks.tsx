import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const STEPS = [
  {
    title: "Nos mandás los planos o el modelo 3D",
    description:
      "Compartí los planos del proyecto o, si ya existe, el modelo 3D del estudio de arquitectura.",
  },
  {
    title: "Creamos la experiencia",
    description:
      "Armamos la maqueta interactiva, el selector de unidades y la simulación de sol para tu desarrollo.",
  },
  {
    title: "La compartís donde quieras",
    description:
      "La subís a tu sitio, la mostrás en redes o la ponés en un QR en el obrador para que la vean en el lugar.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border-subtle bg-background-elevated py-24">
      <Container>
        <SectionHeading
          eyebrow="Cómo funciona"
          title="De los planos a la venta en tres pasos"
        />
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <div className="relative">
                <span className="font-display text-5xl text-foreground-muted/30">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-xl">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
