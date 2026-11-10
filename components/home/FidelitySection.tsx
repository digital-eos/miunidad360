import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FidelityStages } from "@/components/home/FidelityStages";
import { featuredProject } from "@/config/featured";

export function FidelitySection() {
  return (
    <section
      id="fidelidad"
      className="border-t border-border-subtle py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          eyebrow="Fidelidad"
          title="Del render a la obra, y de la obra a tu 3D"
          description="El mismo edificio en tres momentos: el render del estudio, el edificio construido y nuestro modelo 3D."
        />

        <FidelityStages />

        <div className="mt-6">
          <p className="text-xs leading-relaxed text-foreground-muted/80">
            Render: {featuredProject.autores.render} ·{" "}
            {featuredProject.autores.foto ? `Foto: ${featuredProject.autores.foto} · ` : null}
            Modelo: dataset «Schependomlaan» (ROOT bv, Hendriks Bouw en Ontwikkeling, TU
            Eindhoven), CC BY 4.0
          </p>
        </div>

        <div className="mt-8">
          <a
            href="#resultado"
            className="btn btn-secondary"
          >
            Recorrer en 3D ↓
          </a>
        </div>
      </Container>
    </section>
  );
}
