"use client";

import { useCaptureMode } from "@/lib/hooks/use-capture-mode";

export function ScrollCue({ targetId }: { targetId: string }) {
  const { active } = useCaptureMode();
  if (active) return null;

  return (
    <button
      type="button"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })}
      aria-label="Ver más abajo"
      className="absolute inset-x-0 bottom-28 z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-foreground-muted transition-colors duration-200 hover:border-primary hover:text-primary sm:bottom-24"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
