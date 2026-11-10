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
    <section className="border-t border-border-subtle py-20 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Lo que más nos preguntan" />
        <div className="divide-y divide-border-subtle border-y border-border-subtle">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center text-lg font-normal text-primary transition-transform duration-150 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 max-w-2xl pr-10 text-sm leading-relaxed text-foreground-muted">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
