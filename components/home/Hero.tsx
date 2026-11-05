"use client";

import { motion, useReducedMotion } from "motion/react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Container } from "@/components/ui/Container";
import { StartingMaterial } from "@/components/home/StartingMaterial";

export function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const fadeUp = (delay: number) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay },
        };

  return (
    <section className="relative overflow-hidden bg-background pt-28 pb-16 sm:pt-32 sm:pb-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <motion.p
            {...fadeUp(0)}
            className="font-mono text-xs uppercase tracking-[0.2em] text-accent-strong"
          >
            Digital EOS · Experiencias 3D para proyectos inmobiliarios
          </motion.p>
          <motion.h1
            {...fadeUp(0.05)}
            className="mt-5 font-display text-4xl leading-[1.08] sm:text-5xl"
          >
            Cada unidad de tu proyecto, en 3D y{" "}
            <span className="text-gradient-accent italic">con toda su información.</span>
          </motion.h1>
          <motion.p
            {...fadeUp(0.1)}
            className="mt-6 max-w-xl text-base leading-relaxed text-foreground-muted sm:text-lg"
          >
            Departamentos, casas, lotes, locales o naves: tus clientes tocan una unidad en
            el 3D y ven su superficie, precio, disponibilidad, asoleamiento y avance de
            obra. Partimos de tus renders, planos o modelo BIM y te devolvemos un link
            para compartir.
          </motion.p>
          <motion.div
            {...fadeUp(0.15)}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a
              href="#resultado"
              className="inline-flex items-center justify-center rounded-full border border-border-subtle px-6 py-3 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Mirá el resultado ↓
            </a>
            <WhatsAppButton source="hero" />
          </motion.div>
        </div>

        <motion.div {...fadeUp(0.2)}>
          <StartingMaterial />
        </motion.div>
      </Container>
    </section>
  );
}
