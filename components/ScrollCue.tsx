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
      className="absolute inset-x-0 bottom-28 z-10 mx-auto flex h-9 w-9 animate-bounce items-center justify-center rounded-full border border-border-subtle bg-background/80 text-foreground-muted backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent sm:bottom-24"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
