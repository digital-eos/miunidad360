"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

export type Video = {
  src: string;
  poster: string;
  width: number;
  height: number;
  titulo: string;
  descripcion: string;
};

/**
 * A short project film: shows its poster until it scrolls into view, then plays muted in a
 * loop (browsers only autoplay muted video). It pauses off screen, so it never downloads
 * or decodes while nobody looks. With reduced motion it waits for the play button.
 */
export function VideoProyecto({ video }: { video: Video }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const toggleSound = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted && el.paused) void el.play().catch(() => {});
  };

  return (
    <figure>
      <div className="group relative overflow-hidden rounded-lg bg-[#141716] shadow-[var(--shadow-panel)]">
        <video
          ref={ref}
          src={video.src}
          poster={video.poster}
          width={video.width}
          height={video.height}
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={toggle}
          aria-label={video.descripcion}
          className="block aspect-video h-auto w-full cursor-pointer object-cover"
        />

        {!playing ? (
          <button
            type="button"
            onClick={toggle}
            aria-label="Reproducir video"
            className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors hover:bg-black/25"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20">
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7" aria-hidden>
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
            </span>
          </button>
        ) : null}

        <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-end gap-3 bg-gradient-to-t from-black/45 to-transparent p-3 sm:p-5">
          <span className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pausar video" : "Reproducir video"}
              className="rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              {playing ? "Pausa" : "Play"}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              className="rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              {muted ? "Activar sonido" : "Silenciar"}
            </button>
          </span>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-foreground-muted">{video.descripcion}</figcaption>
    </figure>
  );
}
