import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";

export function UnitTooltip({ unit, x, y }: { unit: Unidad; x: number; y: number }) {
  const rooms = attrNumber(unit, "ambientes");
  return (
    <div
      className="pointer-events-none fixed z-20 w-52 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-border-subtle bg-background/95 p-3 text-sm shadow-lg backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-foreground-muted">{unit.codigo}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `${STATUS_COLORS[unit.estado]}26`,
            color: STATUS_COLORS[unit.estado],
          }}
        >
          {STATUS_LABELS[unit.estado]}
        </span>
      </div>
      <p className="mt-1 font-display text-base">{formatPrecio(unit.precio, unit.moneda)}</p>
      <p className="mt-0.5 text-xs text-foreground-muted">
        {rooms != null ? `${rooms} amb · ` : ""}
        {formatArea(unit.superficieM2)}
        {unit.orientacion ? ` · ${unit.orientacion}` : ""}
      </p>
    </div>
  );
}
