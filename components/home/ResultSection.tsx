"use client";

import Link from "next/link";
import { useInView } from "@/lib/hooks/use-in-view";
import { trackDemoClick } from "@/lib/analytics";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SelectorCanvas } from "@/components/three/demos/selector/SelectorCanvas";
import { CATALUNA_SLUG } from "@/lib/three/cataluna-ii";

export function ResultSection() {
  // The 3D bundle only loads once the frame is close to the viewport (useInView uses a
  // 200px root margin).
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section
      id="resultado"
      className="border-t border-border-subtle py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          title="El resultado: lo que recorren tus clientes"
          description="Tocá una unidad para ver su precio, su plano y su disponibilidad. Filtrá por ambientes, orientación o piso."
        />
      </Container>

      <div className="mx-auto mt-10 w-full max-w-[1200px] px-4 sm:px-8">
        <div ref={ref} className="min-h-[65vh] lg:min-h-[70vh]">
          {inView ? (
            <SelectorCanvas projectSlug={CATALUNA_SLUG} embedded />
          ) : (
            <div className="h-[65vh] rounded-lg border border-border-subtle bg-surface-muted lg:h-[70vh]" />
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href="/demos/torre-aldrey"
            onClick={() => trackDemoClick("selector")}
            className="text-sm font-medium text-foreground transition-colors duration-200 hover:text-primary"
          >
            Abrir en pantalla completa →
          </Link>
        </div>
      </div>
    </section>
  );
}
