import type { Unit } from "@/db/schema";
import { formatArea, formatUsdPrice } from "@/lib/units/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";

export function UnitTooltip({
  unit,
  x,
  y,
}: {
  unit: Unit;
  x: number;
  y: number;
}) {
  return (
    <div
      className="pointer-events-none fixed z-20 w-52 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-border-subtle bg-background/95 p-3 text-sm shadow-lg backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-foreground-muted">{unit.code}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `${STATUS_COLORS[unit.status]}26`,
            color: STATUS_COLORS[unit.status],
          }}
        >
          {STATUS_LABELS[unit.status]}
        </span>
      </div>
      <p className="mt-1 font-display text-base">{formatUsdPrice(unit.priceUsd)}</p>
      <p className="mt-0.5 text-xs text-foreground-muted">
        {unit.rooms} amb · {formatArea(unit.areaM2)} · {unit.orientation}
      </p>
    </div>
  );
}
