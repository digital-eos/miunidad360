import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";

export function LegendCounter({ availableCount }: { availableCount: number }) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 sm:left-6 sm:top-6">
      <div className="pointer-events-auto rounded-2xl border border-border-subtle bg-background/80 px-4 py-3 backdrop-blur-md">
        <p className="font-display text-sm sm:text-base">
          Quedan <span className="text-accent-strong">{availableCount}</span> unidades disponibles
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
                aria-hidden
              />
              <span className="text-xs text-foreground-muted">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
