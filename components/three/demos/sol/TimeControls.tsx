"use client";

import { cn } from "@/lib/utils";
import {
  formatCivilDate,
  formatHour,
  formatTime,
  solsticeDates,
  type CivilDate,
} from "@/lib/sun/sun-position";

export type DatePresetId = "verano" | "equinoccio" | "invierno";

export function getDatePresets(year: number): { id: DatePresetId; label: string; date: CivilDate }[] {
  const { verano, equinoccio, invierno } = solsticeDates(year);
  return [
    { id: "verano", label: "Solsticio de verano (21 dic)", date: verano },
    { id: "equinoccio", label: "Equinoccio (21 mar)", date: equinoccio },
    { id: "invierno", label: "Solsticio de invierno (21 jun)", date: invierno },
  ];
}

type TimeControlsProps = {
  civilDate: CivilDate;
  hour: number;
  isPlaying: boolean;
  sunrise: Date | null;
  sunset: Date | null;
  onHourChange: (hour: number) => void;
  onTogglePlay: () => void;
  onSelectPreset: (date: CivilDate) => void;
  onSelectFreeDate: (date: CivilDate) => void;
  mapaDeSol: boolean;
  onToggleMapaDeSol: () => void;
  datePresets: ReturnType<typeof getDatePresets>;
};

function civilDateToInputValue(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function inputValueToCivilDate(value: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function TimeControls({
  civilDate,
  hour,
  isPlaying,
  sunrise,
  sunset,
  onHourChange,
  onTogglePlay,
  onSelectPreset,
  onSelectFreeDate,
  mapaDeSol,
  onToggleMapaDeSol,
  datePresets,
}: TimeControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 sm:p-6">
      <div className="pointer-events-auto w-full max-w-xl space-y-3 rounded-2xl border border-border-subtle bg-background/90 p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-display text-base capitalize">{formatCivilDate(civilDate)}</p>
            <p className="font-mono text-xs text-foreground-muted">
              {formatHour(hour)} hs · Sale {formatTime(sunrise)} · Se pone {formatTime(sunset)}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMapaDeSol}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200",
              mapaDeSol
                ? "bg-accent text-background"
                : "border border-border-subtle text-foreground-muted hover:text-foreground",
            )}
          >
            Mapa de sol
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-colors duration-200 hover:bg-[#ffb84f]"
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <input
            type="range"
            min={6}
            max={21}
            step={0.25}
            value={hour}
            onChange={(e) => onHourChange(Number(e.target.value))}
            className="h-2 flex-1 accent-accent"
            aria-label="Hora del día"
          />
          <span className="w-12 shrink-0 text-right font-mono text-xs text-foreground-muted">
            {formatHour(hour)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {datePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.date)}
              className="rounded-full border border-border-subtle px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors duration-200 hover:border-accent hover:text-foreground"
            >
              {preset.label}
            </button>
          ))}
          <input
            type="date"
            value={civilDateToInputValue(civilDate)}
            onChange={(e) => {
              const parsed = inputValueToCivilDate(e.target.value);
              if (parsed) onSelectFreeDate(parsed);
            }}
            className="rounded-full border border-border-subtle bg-background px-3 py-1.5 text-xs text-foreground-muted focus:border-accent focus:outline-none"
            aria-label="Elegir otra fecha"
          />
        </div>
      </div>
      <p className="pointer-events-none max-w-md text-center font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted/70">
        Simulación indicativa, no reemplaza un estudio de asoleamiento reglamentario.
      </p>
    </div>
  );
}
