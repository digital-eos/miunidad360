"use client";

import Link from "next/link";
import { BIM_SIZE, floorLevels } from "@/lib/bim/dataset";
import { useInView } from "@/lib/hooks/use-in-view";
import { trackDemoClick } from "@/lib/analytics";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeaturedVisualizer } from "@/components/home/FeaturedVisualizer";

const POSTER_SRC = "/images/hero-bim-poster.svg";
const FIRST_FLOOR_CUT_HEIGHT =
  floorLevels.find((f) => f.floor === 1)?.top ?? BIM_SIZE.height * 0.5;

export function ResultSection() {
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
          description="El mismo proyecto, convertido en una experiencia 3D. Cortalo piso por piso, elegí una unidad o mirá cómo avanzó la obra."
        />
      </Container>

      <div className="mx-auto mt-10 w-full max-w-[1200px] px-4 sm:px-8">
        <div
          ref={ref}
          className="relative h-[65vh] w-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated sm:h-[70vh]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static poster behind the 3D scene, shown instantly */}
          <img
            src={POSTER_SRC}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {inView ? (
            <FeaturedVisualizer
              initialMode="corte"
              initialCutHeight={FIRST_FLOOR_CUT_HEIGHT}
              enableIdleHint
              modeSwitcherTopClassName="top-4"
              posterSrc={POSTER_SRC}
              containedPanel
            />
          ) : null}
        </div>

        <div className="mt-4 flex justify-end">
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
