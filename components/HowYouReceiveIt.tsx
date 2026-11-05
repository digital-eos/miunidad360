import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const CHANNELS = [
  {
    title: "Un link propio",
    description:
      "Lo mandás por WhatsApp o por mail y tus clientes lo abren desde el celular o la compu.",
  },
  {
    title: "En tu sitio web",
    description:
      "Lo sumás a la web del proyecto para que lo recorran sin salir de tu página.",
  },
  {
    title: "En el obrador",
    description:
      "Un QR en el cartel de obra para que lo vean en el lugar, parados frente al terreno.",
  },
];

export function HowYouReceiveIt() {
  return (
    <section
      id="como-lo-recibis"
      className="scroll-mt-6 border-t border-border-subtle bg-background-elevated py-24"
    >
      <Container>
        <SectionHeading eyebrow="Cómo lo recibís" title="Un link listo para compartir" />
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {CHANNELS.map((channel, index) => (
            <Reveal key={channel.title} delay={index * 0.08}>
              <span className="font-display text-5xl text-foreground-muted/30">
                {index + 1}
              </span>
              <h3 className="mt-4 font-display text-xl">{channel.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                {channel.description}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
