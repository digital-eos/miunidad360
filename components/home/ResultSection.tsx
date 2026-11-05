"use client";

import Link from "next/link";
import { featuredProject } from "@/config/featured";
import { useInView } from "@/lib/hooks/use-in-view";
import { trackDemoClick } from "@/lib/analytics";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeaturedVisualizer } from "@/components/home/FeaturedVisualizer";
import { BimInfoPanel } from "@/components/three/demos/bim/BimInfoPanel";
import { useBimViewer } from "@/components/three/demos/bim/use-bim-viewer";

const POSTER_SRC = "/images/hero-bim-poster.svg";

export function ResultSection() {
  const viewer = useBimViewer();
  // The poster shows right away; the 3D bundle and model only load once the frame is
  // close to the viewport (useInView uses a 200px root margin).
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section
      id="resultado"
      className="scroll-mt-6 border-t border-border-subtle py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          title="El resultado: lo que recorren tus clientes"
          description="Tocá una unidad para ver sus datos. Cortalo piso por piso o mirá cómo avanzó la obra."
        />
      </Container>

      <div className="mx-auto mt-10 grid w-full max-w-[1200px] gap-4 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          ref={ref}
          className="relative h-[65vh] w-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated lg:h-[70vh]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static poster behind the 3D scene, shown instantly */}
          <img
            src={POSTER_SRC}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {inView ? (
            <FeaturedVisualizer
              viewer={viewer}
              enableIdleHint
              modeSwitcherTopClassName="top-4"
              posterSrc={POSTER_SRC}
            />
          ) : null}
        </div>

        <BimInfoPanel
          viewer={viewer}
          projectName={`${featuredProject.nombre} · ${featuredProject.ubicacion}`}
          className="rounded-2xl border border-border-subtle lg:h-[70vh]"
        />

        <div className="flex justify-end lg:col-span-2">
          <Link
            href="/demos/bim"
            onClick={() => trackDemoClick("bim")}
            className="text-sm font-medium text-foreground transition-colors duration-200 hover:text-accent-strong"
          >
            Abrir en pantalla completa →
          </Link>
        </div>
      </div>
    </section>
  );
}
