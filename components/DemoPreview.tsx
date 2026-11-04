"use client";

import { motion, useReducedMotion } from "motion/react";
import { MaquetaPreviewCanvas } from "@/components/three/demos/maqueta/MaquetaPreviewCanvas";
import { STATUS_COLORS } from "@/lib/units/status-colors";

type DemoPreviewProps = {
  kind: "maqueta" | "selector" | "sol";
};

// Representative status mix for the homepage preview grid (disponible/reservada/vendida).
const PREVIEW_UNIT_STATUSES = [
  "disponible",
  "disponible",
  "reservada",
  "disponible",
  "vendida",
  "disponible",
  "disponible",
  "reservada",
  "disponible",
  "vendida",
  "disponible",
  "disponible",
] as const;

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
        {PREVIEW_UNIT_STATUSES.map((status, i) => {
          const color = STATUS_COLORS[status];
          return (
            <motion.div
              key={i}
              className="rounded-sm border border-border-subtle"
              style={{ backgroundColor: `${color}1a` }}
              animate={
                shouldReduceMotion
                  ? undefined
                  : { backgroundColor: [`${color}00`, `${color}55`, `${color}00`] }
              }
              transition={loop ? { ...loop, delay: (i % 5) * 0.3 } : undefined}
            />
          );
        })}
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
