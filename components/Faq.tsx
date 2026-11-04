import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const FAQS = [
  {
    question: "¿Cuánto tarda en estar lista la experiencia?",
    answer:
      "Depende de la cantidad de unidades y de la información que ya tengas lista (planos, modelo 3D). Te damos un plazo estimado cuando vemos tu proyecto.",
  },
  {
    question: "¿Qué formatos de archivo aceptan?",
    answer:
      "Planos en PDF o DWG, y modelos 3D en formatos como FBX, GLTF/GLB o OBJ. Si tenés otro formato, contanos y lo revisamos.",
  },
  {
    question: "¿Funciona bien en el celular?",
    answer:
      "Sí. La experiencia está pensada mobile first, porque la mayoría de los visitantes llega desde Instagram y otras redes desde el teléfono.",
  },
  {
    question: "¿Cómo actualizo la disponibilidad de las unidades?",
    answer:
      "Nos avisás qué unidad se vendió o reservó y actualizamos el estado. Más adelante vas a poder hacerlo vos mismo desde un panel.",
  },
  {
    question: "¿Dónde se hospeda la experiencia?",
    answer:
      "La alojamos nosotros en nuestra infraestructura y te compartimos un link listo para usar en tu sitio, redes o un QR.",
  },
  {
    question: "¿Cuál es el precio?",
    answer:
      "Depende del tamaño del proyecto y de qué módulos necesitás (maqueta, selector, sol). Escribinos y te armamos una propuesta a medida.",
  },
];

export function Faq() {
  return (
    <section className="border-t border-border-subtle bg-background-elevated py-24">
      <Container>
        <SectionHeading eyebrow="Preguntas frecuentes" title="Lo que más nos preguntan" />
        <div className="mt-12 divide-y divide-border-subtle border-y border-border-subtle">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg">
                {faq.question}
                <span className="shrink-0 font-mono text-accent-strong transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground-muted">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
