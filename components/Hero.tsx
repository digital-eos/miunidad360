"use client";

import { motion, useReducedMotion } from "motion/react";
import { HeroCanvas } from "@/components/three/HeroCanvas";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Container } from "@/components/ui/Container";
import { trackDemoClick } from "@/lib/analytics";

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-grid">
      <HeroCanvas />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(10,10,11,0.95) 32%, rgba(10,10,11,0.55) 55%, rgba(10,10,11,0.2) 75%), linear-gradient(to bottom, rgba(10,10,11,0.15), rgba(10,10,11,0.7) 60%, var(--background) 97%)",
        }}
      />
      <Container className="relative z-10">
        <motion.p
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-accent"
        >
          Digital EOS · Experiencias 3D para real estate
        </motion.p>
        <motion.h1
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl font-display text-4xl leading-[1.05] sm:text-6xl"
        >
          Vendé tus unidades{" "}
          <span className="text-gradient-accent italic">antes de construirlas</span>
        </motion.h1>
        <motion.p
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-xl text-lg text-foreground-muted"
        >
          Tu comprador explora el edificio en 3D, elige su unidad y ve disponibilidad,
          precio y sol en tiempo real.
        </motion.p>
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <a
            href="#demos"
            onClick={() => trackDemoClick("maqueta")}
            className="inline-flex items-center justify-center rounded-full border border-border-subtle px-6 py-3 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            Ver demos
          </a>
          <WhatsAppButton source="hero" />
        </motion.div>
      </Container>
    </section>
  );
}
