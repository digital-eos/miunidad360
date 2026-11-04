"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";

export function BackToHomeLink({ className }: { className?: string }) {
  const { active } = useCaptureMode();
  if (active) return null;

  return (
    <Link
      href="/"
      className={cn(
        "absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent sm:left-6 sm:top-6 sm:text-sm",
        className,
      )}
    >
      ← Volver al inicio
    </Link>
  );
}
