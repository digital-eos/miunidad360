"use client";

type SunDetailPanelProps = {
  unitCode: string;
  dateLabel: string;
  hoursForDate: number | null;
  hoursVerano: number | null;
  hoursInvierno: number | null;
  onClose: () => void;
};

function formatHours(hours: number | null): string {
  if (hours == null) return "calculando…";
  return `${hours.toFixed(1)} h`;
}

export function SunDetailPanel({
  unitCode,
  dateLabel,
  hoursForDate,
  hoursVerano,
  hoursInvierno,
  onClose,
}: SunDetailPanelProps) {
  return (
    <div className="pointer-events-auto absolute right-4 top-20 w-64 rounded-2xl border border-border-subtle bg-background/95 p-4 backdrop-blur-md sm:right-6 sm:top-24">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-xs text-foreground-muted">{unitCode}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle text-sm transition-colors duration-200 hover:border-accent hover:text-accent-strong"
        >
          ×
        </button>
      </div>

      <p className="mt-2 font-display text-lg leading-snug">
        {formatHours(hoursForDate)} de sol directo
        <br />
        <span className="text-sm text-foreground-muted">el {dateLabel}</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-subtle pt-3 text-sm">
        <div>
          <p className="text-xs text-foreground-muted">Verano</p>
          <p>{formatHours(hoursVerano)}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Invierno</p>
          <p>{formatHours(hoursInvierno)}</p>
        </div>
      </div>
    </div>
  );
}
