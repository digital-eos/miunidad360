"use client";

import { bimDataset, weekNumbers } from "@/lib/bim/dataset";

function formatWeekDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(
    date,
  );
}

type WeekControlsProps = {
  weekIndex: number;
  weekCount: number;
  currentWeek: number;
  isPlaying: boolean;
  onChangeIndex: (index: number) => void;
  onTogglePlay: () => void;
};

export function WeekControls({
  weekIndex,
  weekCount,
  currentWeek,
  isPlaying,
  onChangeIndex,
  onTogglePlay,
}: WeekControlsProps) {
  const entry = bimDataset.weeks[String(currentWeek)];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-9 flex flex-col items-center gap-2 p-3 sm:bottom-11 sm:p-6">
      <div className="pointer-events-auto w-full max-w-xl space-y-3 rounded-2xl border border-border-subtle bg-background/90 p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-display text-base">Semana {currentWeek}</p>
            <p className="font-mono text-xs text-foreground-muted">
              {entry ? formatWeekDate(entry.date) : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors duration-200 hover:bg-[#ffb84f]"
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <input
            type="range"
            min={0}
            max={weekCount - 1}
            step={1}
            value={weekIndex}
            onChange={(e) => onChangeIndex(Number(e.target.value))}
            className="h-2 flex-1 accent-accent"
            aria-label="Semana de obra"
          />
          <span className="w-10 shrink-0 text-right font-mono text-xs text-foreground-muted">
            S{currentWeek}
          </span>
        </div>

        {entry && entry.tasks.length > 0 ? (
          <ul className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
            {entry.tasks.map((task) => (
              <li
                key={task}
                className="rounded-full border border-border-subtle px-2.5 py-1 text-[11px] text-foreground-muted"
              >
                {task}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="pointer-events-none max-w-md text-center font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted/70">
        {weekNumbers.length} hitos de obra registrados · {bimDataset.origin_date} es la semana 0
      </p>
    </div>
  );
}
