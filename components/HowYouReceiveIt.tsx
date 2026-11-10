import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
      className="border-t border-border-subtle bg-surface-muted py-20 sm:py-24"
    >
      <Container>
        <SectionHeading eyebrow="Cómo lo recibís" title="Un link listo para compartir" />
        <ol className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-10">
          {CHANNELS.map((channel, index) => (
            <li key={channel.title} className="border-t-2 border-primary pt-5">
              <span className="label-caps text-foreground-subtle tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{channel.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {channel.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
