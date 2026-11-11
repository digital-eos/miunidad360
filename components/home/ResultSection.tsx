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

        {/* Main way into the full demo: a large filled button, not a quiet text link. */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/demos/torre-aldrey"
            onClick={() => trackDemoClick("selector")}
            className="btn btn-primary group min-h-14 w-full px-8 text-base shadow-[var(--shadow-panel)] sm:w-auto"
          >
            Abrir en pantalla completa
            <span
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
