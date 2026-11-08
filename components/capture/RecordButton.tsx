"use client";

import { useState, type RefObject } from "react";
import { recordCanvasSequence, downloadBlob } from "@/lib/capture/record-canvas";
import { trackVideoRecorded } from "@/lib/analytics";
import type { CaptureFormat } from "@/lib/hooks/use-capture-mode";

type RecordState = "idle" | "recording" | "error";

export function RecordButton({
  demo,
  format,
  width,
  height,
  stageRef,
  durationMs = 13_000,
}: {
  demo: "selector" | "bim";
  format: CaptureFormat;
  width: number;
  height: number;
  stageRef: RefObject<HTMLDivElement | null>;
  durationMs?: number;
}) {
  const [state, setState] = useState<RecordState>("idle");
  const [progress, setProgress] = useState(0);
  const [withBranding, setWithBranding] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleRecord() {
    const canvas = stageRef.current?.querySelector("canvas");
    if (!canvas) {
      setError("No encontramos la escena 3D todavía, esperá que termine de cargar.");
      setState("error");
      return;
    }

    setState("recording");
    setProgress(0);
    setError(null);

    try {
      const result = await recordCanvasSequence({
        sourceCanvas: canvas,
        width,
        height,
        durationMs,
        branding: withBranding ? { tagline: "Pedí tu demo en miunidad360.com.ar" } : null,
        onProgress: setProgress,
      });
      downloadBlob(result.blob, `miunidad360-${demo}-${format}.${result.extension}`);
      trackVideoRecorded(demo, format);
      setState("idle");
    } catch (err) {
      console.error(err);
      setError("No pudimos grabar el video en este navegador. Probá con Chrome.");
      setState("error");
    }
  }

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <label className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
        <input
          type="checkbox"
          checked={withBranding}
          onChange={(e) => setWithBranding(e.target.checked)}
          disabled={state === "recording"}
          className="h-3.5 w-3.5 accent-accent"
        />
        Logo y frase
      </label>
      <button
        type="button"
        onClick={handleRecord}
        disabled={state === "recording"}
        className="flex items-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-lg shadow-black/30 transition-opacity duration-200 disabled:opacity-80"
      >
        {state === "recording" ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-background" />
            Grabando… {Math.round(progress * 100)}%
          </>
        ) : (
          <>
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            Grabar video
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className="max-w-[220px] text-center text-[11px] text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
