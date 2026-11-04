"use client";

import { cn } from "@/lib/utils";
import { trackWhatsAppClick } from "@/lib/analytics";

type WhatsAppButtonProps = {
  source: string;
  label?: string;
  message?: string;
  className?: string;
  variant?: "solid" | "outline";
};

const DEFAULT_MESSAGE = "¡Hola! Quiero pedir una demo de MiUnidad360 para mi desarrollo.";

export function WhatsAppButton({
  source,
  label = "Hablemos por WhatsApp",
  message = DEFAULT_MESSAGE,
  className,
  variant = "solid",
}: WhatsAppButtonProps) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsAppClick(source)}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors duration-200",
        variant === "solid"
          ? "bg-accent text-background hover:bg-[#ffb84f]"
          : "border border-border-subtle text-foreground hover:border-accent hover:text-accent",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.15.333-.385.5-.578.166-.19.222-.33.333-.556.11-.223.055-.414-.03-.583-.084-.17-.72-1.738-.986-2.38-.26-.625-.523-.542-.72-.552-.198-.01-.422-.012-.646-.012-.223 0-.588.085-.902.407-.313.321-1.195 1.17-1.195 2.86 0 1.688 1.223 3.321 1.396 3.55.173.231 2.39 3.656 5.792 4.97 3.4 1.315 3.4.876 4.012.823.61-.055 1.977-.806 2.257-1.584.282-.778.282-1.444.198-1.584-.082-.14-.297-.223-.595-.372z" />
        <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.44 1.267 4.896L2 22l5.233-1.273A9.95 9.95 0 0012.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10zm0 18.17a8.14 8.14 0 01-4.15-1.137l-.297-.176-3.106.756.767-3.03-.193-.31A8.146 8.146 0 013.87 12c0-4.5 3.66-8.17 8.17-8.17 4.5 0 8.17 3.67 8.17 8.17 0 4.51-3.67 8.17-8.17 8.17z" />
      </svg>
      {label}
    </a>
  );
}
