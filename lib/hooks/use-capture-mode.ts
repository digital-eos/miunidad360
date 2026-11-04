"use client";

import { useSearchParams } from "next/navigation";

export type CaptureFormat = "9x16" | "4x5";

export type CaptureMode = {
  active: boolean;
  format: CaptureFormat;
  /** Export resolution in pixels for this format. */
  width: number;
  height: number;
};

const FORMAT_DIMENSIONS: Record<CaptureFormat, { width: number; height: number }> = {
  "9x16": { width: 1080, height: 1920 },
  "4x5": { width: 1080, height: 1350 },
};

export function useCaptureMode(): CaptureMode {
  const searchParams = useSearchParams();
  const active = searchParams.get("capture") === "1";
  const format: CaptureFormat = searchParams.get("format") === "4x5" ? "4x5" : "9x16";
  const { width, height } = FORMAT_DIMENSIONS[format];

  return { active, format, width, height };
}
