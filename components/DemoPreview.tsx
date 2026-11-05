"use client";

import { motion, useReducedMotion } from "motion/react";
import { MaquetaPreviewCanvas } from "@/components/three/demos/maqueta/MaquetaPreviewCanvas";
import { STATUS_COLORS } from "@/lib/units/status-colors";

type DemoPreviewProps = {
  kind: "maqueta" | "selector" | "sol" | "bim";
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

  if (kind === "bim") {
    const floorColors = ["#90a4c0", "#e8d9b8", "#aed3e0", "#d98f6c"];
    return (
      <div className="relative h-40 overflow-hidden rounded-xl bg-background">
        <svg viewBox="0 0 300 160" className="h-full w-full" aria-hidden>
          {floorColors.map((color, i) => (
            <motion.rect
              key={i}
              x={90}
              y={130 - (i + 1) * 24}
              width={120}
              height={20}
              rx={2}
              fill={color}
              opacity={0.85}
              animate={shouldReduceMotion ? undefined : { opacity: [0.2, 0.85, 0.85] }}
              transition={loop ? { ...loop, duration: 3.5, delay: i * 0.5 } : undefined}
            />
          ))}
          <line
            x1={70}
            y1={34}
            x2={70}
            y2={130}
            stroke="var(--border-subtle)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <line x1={20} y1={130} x2={280} y2={130} stroke="var(--border-subtle)" strokeWidth={1} />
        </svg>
      </div>
    );
  }

  const sunArcX = [20, 63.3, 106.7, 150, 193.3, 236.7, 280];
  const sunArcY = [120, 75, 42.1, 30, 42.1, 75, 120];
  const sunArcColor = ["#ffb066", "#ffcf8c", "#fff0cf", "#fff6e8", "#fff0cf", "#ffcf8c", "#ffb066"];

  return (
    <div className="relative h-40 overflow-hidden rounded-xl bg-background">
      <svg viewBox="0 0 300 160" className="h-full w-full" aria-hidden>
        <path
          d="M 20 120 Q 150 -30 280 120"
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
        <line x1={10} y1={122} x2={290} y2={122} stroke="var(--border-subtle)" strokeWidth={1} />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={140 + i * 14}
            y={122 - (i % 2 === 0 ? 36 : 26)}
            width={10}
            height={i % 2 === 0 ? 36 : 26}
            fill="var(--foreground)"
            opacity={0.15}
          />
        ))}
        <motion.circle
          r={7}
          animate={
            shouldReduceMotion
              ? undefined
              : { cx: sunArcX, cy: sunArcY, fill: sunArcColor }
          }
          cx={shouldReduceMotion ? 150 : undefined}
          cy={shouldReduceMotion ? 30 : undefined}
          fill={shouldReduceMotion ? "#fff6e8" : undefined}
          transition={loop ? { ...loop, duration: 6 } : undefined}
          style={{ filter: "blur(0.5px)" }}
        />
      </svg>
    </div>
  );
}
