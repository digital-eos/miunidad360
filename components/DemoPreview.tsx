"use client";

import { motion, useReducedMotion } from "motion/react";
import { MaquetaPreviewCanvas } from "@/components/three/demos/maqueta/MaquetaPreviewCanvas";

type DemoPreviewProps = {
  kind: "maqueta" | "selector" | "sol";
};

export function DemoPreview({ kind }: DemoPreviewProps) {
  const shouldReduceMotion = useReducedMotion();
  const loop = shouldReduceMotion
    ? undefined
    : { repeat: Infinity, duration: 4, ease: "easeInOut" as const };

  if (kind === "maqueta") {
    return <MaquetaPreviewCanvas />;
  }

  if (kind === "selector") {
    return (
      <div className="relative grid h-40 grid-cols-4 grid-rows-3 gap-1.5 overflow-hidden rounded-xl bg-background p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-sm border border-border-subtle"
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    backgroundColor: [
                      "rgba(240,166,59,0)",
                      "rgba(240,166,59,0.45)",
                      "rgba(240,166,59,0)",
                    ],
                  }
            }
            transition={loop ? { ...loop, delay: (i % 5) * 0.3 } : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl bg-background">
      <motion.div
        className="absolute h-24 w-24 rounded-full bg-accent/70 blur-xl"
        animate={
          shouldReduceMotion ? undefined : { x: [-60, 60, -60], y: [-10, 20, -10] }
        }
        transition={loop ? { ...loop, duration: 6 } : undefined}
      />
      <div className="absolute inset-x-6 bottom-6 h-px bg-border-subtle" />
    </div>
  );
}
