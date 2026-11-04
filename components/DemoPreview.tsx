"use client";

import { motion, useReducedMotion } from "motion/react";

type DemoPreviewProps = {
  kind: "maqueta" | "selector" | "sol";
};

export function DemoPreview({ kind }: DemoPreviewProps) {
  const shouldReduceMotion = useReducedMotion();
  const loop = shouldReduceMotion
    ? undefined
    : { repeat: Infinity, duration: 4, ease: "easeInOut" as const };

  if (kind === "maqueta") {
    return (
      <div className="relative flex h-40 items-end justify-center gap-2 overflow-hidden rounded-xl bg-background p-4">
        {[0.5, 0.9, 0.65, 1, 0.75].map((h, i) => (
          <motion.div
            key={i}
            className="w-6 rounded-sm bg-foreground/15"
            style={{ height: `${h * 100}%` }}
            animate={shouldReduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
            transition={loop ? { ...loop, delay: i * 0.2 } : undefined}
          />
        ))}
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>
    );
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
