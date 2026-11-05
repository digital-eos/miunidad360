"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";
import { trackCaptureModeEntered } from "@/lib/analytics";
import { RecordButton } from "./RecordButton";

const FRAME_MARGIN = 28;

export function CaptureStage({
  demo,
  children,
}: {
  demo: "maqueta" | "selector" | "sol" | "bim";
  children: ReactNode;
}) {
  const { active, format, width, height } = useCaptureMode();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stageRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width, height });

  useEffect(() => {
    if (!active) return;
    trackCaptureModeEntered(demo, format);
  }, [active, demo, format]);

  // Size the on-screen frame to the export aspect ratio, without any CSS
  // transform: react-three-fiber measures the canvas container's real
  // (untransformed) box, so a `transform: scale()` trick here would make it
  // render at the tiny post-transform size instead of a usable resolution.
  // The recorder composites whatever the canvas actually renders at onto the
  // exact export resolution, so this on-screen size only needs to match the
  // aspect ratio.
  useEffect(() => {
    if (!active) return;
    const aspect = width / height;
    function recompute() {
      const availableW = window.innerWidth - FRAME_MARGIN * 2;
      const availableH = window.innerHeight - 140;
      let frameW = availableW;
      let frameH = frameW / aspect;
      if (frameH > availableH) {
        frameH = availableH;
        frameW = frameH * aspect;
      }
      setFrameSize({ width: Math.round(frameW), height: Math.round(frameH) });
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [active, width, height]);

  if (!active) {
    return <div className="relative h-[100svh] w-full">{children}</div>;
  }

  const otherFormat = format === "9x16" ? "4x5" : "9x16";
  const formatHref = (() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", otherFormat);
    return `${pathname}?${params.toString()}`;
  })();
  const exitHref = pathname ?? "/";

  return (
    <div className="relative flex h-[100svh] w-full flex-col items-center justify-center gap-4 bg-black py-6">
      <div
        ref={stageRef}
        className="relative overflow-hidden rounded-xl shadow-2xl shadow-black/70"
        style={{ width: frameSize.width, height: frameSize.height }}
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <a
          href={exitHref}
          className="pointer-events-auto rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
        >
          ✕ Salir del modo video
        </a>
        <a
          href={formatHref}
          className="pointer-events-auto rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
        >
          Formato: {format === "9x16" ? "9:16" : "4:5"} · cambiar a {otherFormat}
        </a>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <RecordButton demo={demo} format={format} width={width} height={height} stageRef={stageRef} />
      </div>
    </div>
  );
}
