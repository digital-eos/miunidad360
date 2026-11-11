import { cn } from "@/lib/utils";
import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

/**
 * Light preview drawn over the 3D view next to the hovered unit: figures only, so hovering
 * never loads images. It lets the pointer pass through and disappears once the pointer
 * leaves the unit. Clicking a unit opens its details in the panel beside the view instead.
 */
export function UnitPin({ unit }: { unit: Unidad }) {
  const rooms = attrNumber(unit, "ambientes");

  return (
    <div
      className={cn(
        "pointer-events-none w-[min(16rem,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-[calc(100%+12px)]",
        "rounded-lg border border-border-subtle bg-surface p-4 shadow-[var(--shadow-panel)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm tabular-nums text-foreground-muted">{unit.codigo}</span>
        <StatusBadge status={unit.estado} size="sm" />
      </div>
      <p className="mt-1 font-display text-2xl">{formatPrecio(unit.precio, unit.moneda)}</p>
      <p className="mt-0.5 text-sm text-foreground-muted">
        {rooms != null ? `${rooms} amb · ` : ""}
        {formatArea(unit.superficieM2)}
        {unit.orientacion ? ` · ${unit.orientacion}` : ""}
      </p>
      <p className="mt-3 text-xs text-foreground-muted">Hacé clic para ver la ficha</p>
    </div>
  );
}
