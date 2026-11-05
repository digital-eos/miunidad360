"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { featuredProject } from "@/config/featured";
import { BIM_SIZE, floorLevels } from "@/lib/bim/dataset";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { trackDemoClick } from "@/lib/analytics";
import { FeaturedVisualizer } from "@/components/home/FeaturedVisualizer";
import { BeforeAfterSlider } from "@/components/home/BeforeAfterSlider";

const FIRST_FLOOR_CUT_HEIGHT = floorLevels.find((f) => f.floor === 1)?.top ?? BIM_SIZE.height * 0.5;

export function FeaturedHero() {
  const shouldReduceMotion = useReducedMotion();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const activePhoto = featuredProject.fotos[activePhotoIndex];
  const cameraOverride = activePhoto
    ? { position: activePhoto.camara.posicion, target: activePhoto.camara.objetivo }
    : null;

  return (
    <section className="relative h-[70vh] w-full overflow-hidden bg-background sm:h-[85vh]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static poster behind the 3D scene, shown instantly */}
      <img
        src="/images/hero-bim-poster.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      <FeaturedVisualizer
        initialMode="corte"
        initialCutHeight={FIRST_FLOOR_CUT_HEIGHT}
        cameraOverride={cameraOverride}
        cameraOverrideKey={String(activePhotoIndex)}
        enableIdleHint
        modeSwitcherTopClassName="top-20 sm:top-24"
        posterSrc="/images/hero-bim-poster.svg"
        bottomPanelAlign="end"
      />

      {featuredProject.fotos.length > 0 ? (
        <BeforeAfterSlider
          photos={featuredProject.fotos}
          credito={featuredProject.credito}
          activeIndex={activePhotoIndex}
          onActiveIndexChange={setActivePhotoIndex}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-32 bottom-auto z-30 pb-6 sm:top-auto sm:bottom-0 sm:bg-gradient-to-t sm:from-background/85 sm:via-background/20 sm:to-transparent sm:pb-24 sm:pt-16">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-border-subtle bg-background/80 p-4 backdrop-blur-md sm:max-w-lg sm:bg-background/70 sm:p-6">
            <motion.h1
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-2xl leading-[1.1] sm:text-4xl"
            >
              Vendé tus unidades{" "}
              <span className="text-gradient-accent italic">antes de construirlas</span>
            </motion.h1>
            <motion.p
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-3 hidden text-sm text-foreground-muted sm:block"
            >
              Tu comprador explora el edificio en 3D, elige su unidad y ve disponibilidad, precio y
              sol en tiempo real.
            </motion.p>
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 flex flex-wrap items-center gap-3"
            >
              <a
                href="#demos"
                onClick={() => trackDemoClick("maqueta")}
                className="hidden items-center justify-center rounded-full border border-border-subtle px-5 py-2.5 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong sm:inline-flex"
              >
                Ver demos
              </a>
              <WhatsAppButton source="hero" className="px-5 py-2.5 text-sm" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
