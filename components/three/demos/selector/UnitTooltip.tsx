import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";

/** Card pinned above the selected unit in the 3D view: rooms, area and status. */
export function UnitPin({ unit }: { unit: Unidad }) {
  const rooms = attrNumber(unit, "ambientes");
  return (
    <div className="w-max -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl border border-border-subtle bg-background/95 px-3 py-2 shadow-lg backdrop-blur-md">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
        {unit.codigo}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs">
        {rooms != null ? (
          <>
            <dt className="text-foreground-muted">Ambientes</dt>
            <dd className="font-medium">{rooms}</dd>
          </>
        ) : null}
        <dt className="text-foreground-muted">Superficie</dt>
        <dd className="font-medium">{formatArea(unit.superficieM2)}</dd>
        <dt className="text-foreground-muted">Estado</dt>
        <dd className="inline-flex items-center gap-1.5 font-medium">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[unit.estado] }}
          />
          {STATUS_LABELS[unit.estado]}
        </dd>
      </dl>
    </div>
  );
}

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
