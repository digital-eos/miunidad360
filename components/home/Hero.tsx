import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Container } from "@/components/ui/Container";
import { StartingMaterial } from "@/components/home/StartingMaterial";

export function Hero() {
  return (
    <section className="relative bg-background pt-14 pb-16 sm:pt-20 sm:pb-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <p className="eyebrow">
            Digital EOS · Transformá tu propiedad en una experiencia 3D interactiva
          </p>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] text-balance sm:text-5xl">
            Cada unidad de tu proyecto, en 3D y con toda su información.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground-muted sm:text-lg">
            Edificios, departamentos, casas, lotes o galpones: convertimos tus planos,
            renders o modelo BIM en una publicación 3D con su propio link. Tus compradores
            tocan cada unidad y ven su superficie, precio y disponibilidad desde el
            navegador.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <WhatsAppButton source="hero" />
            <a href="#resultado" className="btn btn-secondary">
              Mirá el resultado
            </a>
          </div>
        </div>

        <StartingMaterial />
      </Container>
    </section>
  );
}
