"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CALENDAR_CATEGORY_COLORS,
  CALENDAR_CATEGORY_LABELS,
  LAST_WEEK,
  categoriesForWeek,
  dateForWeek,
  formatCalendarDate,
  milestoneAtOrBefore,
  milestoneWeekByDate,
  progressPercentForWeek,
  translateTasks,
  weekForDate,
  type CalendarCategory,
} from "@/lib/bim/calendar";
import { bimDataset } from "@/lib/bim/dataset";

const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const CATEGORY_ORDER: CalendarCategory[] = [
  "estructura",
  "muros",
  "fachada",
  "techo",
  "terminaciones",
];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

type AvanceCalendarProps = {
  currentWeek: number;
  isPlaying: boolean;
  onChangeWeek: (week: number) => void;
  onTogglePlay: () => void;
  onCompleteBuild: () => void;
  align?: "center" | "end";
};

export function AvanceCalendar({
  currentWeek,
  isPlaying,
  onChangeWeek,
  onTogglePlay,
  onCompleteBuild,
  align = "center",
}: AvanceCalendarProps) {
  const currentDate = dateForWeek(currentWeek);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(currentDate));
  const [syncedWeek, setSyncedWeek] = useState(currentWeek);

  if (currentWeek !== syncedWeek) {
    setSyncedWeek(currentWeek);
    setViewMonth(startOfMonth(currentDate));
  }

  const minMonth = useMemo(() => startOfMonth(dateForWeek(0)), []);
  const maxMonth = useMemo(() => startOfMonth(dateForWeek(LAST_WEEK)), []);

  const cells = useMemo(() => {
    const leading = (startOfMonth(viewMonth).getDay() + 6) % 7;
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const list: { day: number; date: Date; iso: string; milestoneWeek: number | null }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      const iso = toIsoDate(date);
      list.push({ day, date, iso, milestoneWeek: milestoneWeekByDate.get(iso) ?? null });
    }
    return { leading, list };
  }, [viewMonth]);

  const activeMilestone = milestoneAtOrBefore(currentWeek);
  const activeEntry = activeMilestone !== null ? bimDataset.weeks[String(activeMilestone)] : null;
  const isExactMilestoneDay = activeMilestone === currentWeek;
  const progress = progressPercentForWeek(currentWeek);
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(
    viewMonth,
  );

  const canGoPrev = viewMonth.getTime() > minMonth.getTime();
  const canGoNext = viewMonth.getTime() < maxMonth.getTime();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-9 z-30 flex flex-col gap-2 p-3 sm:bottom-11 sm:p-6",
        align === "end" ? "items-end" : "items-center",
      )}
    >
      <div className="pointer-events-auto max-h-[44vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border-subtle bg-background/90 p-4 backdrop-blur-md sm:max-h-none">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-display text-base">
              Semana {currentWeek} de {LAST_WEEK}
            </p>
            <p className="font-mono text-xs text-foreground-muted">
              {formatCalendarDate(currentDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors duration-200 hover:bg-[#ffb84f]"
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={onCompleteBuild}
              className="rounded-full border border-border-subtle px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong"
            >
              Obra completa
            </button>
          </div>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border-subtle">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => canGoPrev && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            disabled={!canGoPrev}
            aria-label="Mes anterior"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-xs transition-colors duration-200 hover:border-accent hover:text-accent-strong disabled:opacity-30"
          >
            ‹
          </button>
          <p className="font-display text-sm capitalize">{monthLabel}</p>
          <button
            type="button"
            onClick={() => canGoNext && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            disabled={!canGoNext}
            aria-label="Mes siguiente"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-xs transition-colors duration-200 hover:border-accent hover:text-accent-strong disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-wide text-foreground-muted">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: cells.leading }).map((_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {cells.list.map(({ day, date, milestoneWeek }) => {
            const isCurrent = sameMonth(date, currentDate) && date.getDate() === currentDate.getDate();
            const categories = milestoneWeek !== null ? categoriesForWeek(milestoneWeek) : [];
            return (
              <button
                key={day}
                type="button"
                onClick={() => onChangeWeek(weekForDate(date))}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] transition-colors duration-200 hover:bg-background-elevated",
                  isCurrent
                    ? "bg-accent-soft font-medium text-accent-strong ring-1 ring-accent"
                    : "text-foreground",
                )}
              >
                <span>{day}</span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: CALENDAR_CATEGORY_COLORS[cat] }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3">
          {CATEGORY_ORDER.map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 text-[10px] text-foreground-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CALENDAR_CATEGORY_COLORS[cat] }}
              />
              {CALENDAR_CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>

        {activeEntry ? (
          <div className="mt-3 border-t border-border-subtle pt-3">
            <p className="text-sm font-medium">
              {isExactMilestoneDay ? "Tareas de este día" : "Tareas de la última etapa"}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {translateTasks(activeEntry.tasks).map((task) => (
                <li
                  key={task}
                  className="rounded-full border border-border-subtle px-2.5 py-1 text-[11px] text-foreground-muted"
                >
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
