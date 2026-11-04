"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trackWhatsAppClick } from "@/lib/analytics";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";

const PAGE_MESSAGES: Record<string, string> = {
  "/": "¡Hola! Quiero pedir una demo de MiUnidad360 para mi desarrollo.",
  "/demos/maqueta":
    "¡Hola! Estaba mirando la maqueta 3D de MiUnidad360 y quiero saber más para mi proyecto.",
  "/demos/selector":
    "¡Hola! Estaba probando el selector de unidades de MiUnidad360 y quiero saber más para mi proyecto.",
  "/demos/sol":
    "¡Hola! Estaba probando el estudio de asoleamiento de MiUnidad360 y quiero saber más para mi proyecto.",
};

// Mobile bottom offset per route, clearing each demo's own bottom control panel
// (the sun-study timeline is the tallest, stacked on narrow screens).
const MOBILE_BOTTOM_OFFSET: Record<string, string> = {
  "/demos/maqueta": "bottom-32",
  "/demos/selector": "bottom-6",
  "/demos/sol": "bottom-[26rem]",
};

const DEFAULT_MESSAGE = "¡Hola! Quiero pedir una demo de MiUnidad360 para mi desarrollo.";

export function FloatingWhatsApp() {
  const pathname = usePathname();
  const { active: captureActive } = useCaptureMode();

  if (pathname?.startsWith("/admin") || captureActive) return null;

  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const message = PAGE_MESSAGES[pathname ?? "/"] ?? DEFAULT_MESSAGE;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const mobileBottom = MOBILE_BOTTOM_OFFSET[pathname ?? "/"] ?? "bottom-6";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsAppClick("floating-button")}
      aria-label="Hablar por WhatsApp"
      className={cn(
        "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-105 sm:bottom-6 sm:right-6",
        mobileBottom,
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.15.333-.385.5-.578.166-.19.222-.33.333-.556.11-.223.055-.414-.03-.583-.084-.17-.72-1.738-.986-2.38-.26-.625-.523-.542-.72-.552-.198-.01-.422-.012-.646-.012-.223 0-.588.085-.902.407-.313.321-1.195 1.17-1.195 2.86 0 1.688 1.223 3.321 1.396 3.55.173.231 2.39 3.656 5.792 4.97 3.4 1.315 3.4.876 4.012.823.61-.055 1.977-.806 2.257-1.584.282-.778.282-1.444.198-1.584-.082-.14-.297-.223-.595-.372z" />
        <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.44 1.267 4.896L2 22l5.233-1.273A9.95 9.95 0 0012.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10zm0 18.17a8.14 8.14 0 01-4.15-1.137l-.297-.176-3.106.756.767-3.03-.193-.31A8.146 8.146 0 013.87 12c0-4.5 3.66-8.17 8.17-8.17 4.5 0 8.17 3.67 8.17 8.17 0 4.51-3.67 8.17-8.17 8.17z" />
      </svg>
    </a>
  );
}
