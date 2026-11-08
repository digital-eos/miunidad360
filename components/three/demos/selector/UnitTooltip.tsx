import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";

const PHOTO_SLOTS = 2;

/** Code, status, price and the short spec line: shared by the hover card and the pin. */
function UnitSummary({ unit }: { unit: Unidad }) {
  const rooms = attrNumber(unit, "ambientes");
  return (
    <>
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
    </>
  );
}

/**
 * Card pinned above the clicked unit in the 3D view: the hover card's figures, the unit's
 * photos, and its actions.
 */
export function UnitPin({
  unit,
  photos,
  onView,
  onClose,
}: {
  unit: Unidad;
  /** Interior photo URLs; the first two are shown. */
  photos: string[];
  onView?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto w-60 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl border border-border-subtle bg-background/95 p-3 text-sm shadow-lg backdrop-blur-md">
      <UnitSummary unit={unit} />
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {Array.from({ length: PHOTO_SLOTS }, (_, i) =>
          photos[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={photos[i]}
              alt={`${unit.codigo}, foto ${i + 1}`}
              className="aspect-[4/3] w-full rounded-md object-cover"
            />
          ) : (
            <div
              key={i}
              aria-hidden
              className="aspect-[4/3] w-full rounded-md border border-dashed border-border-subtle bg-background-elevated"
            />
          ),
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onView}
          className="flex-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity duration-200 hover:opacity-90"
        >
          Ver
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border border-border-subtle px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors duration-200 hover:border-accent hover:text-foreground"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export function UnitTooltip({ unit, x, y }: { unit: Unidad; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none fixed z-20 w-52 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-border-subtle bg-background/95 p-3 text-sm shadow-lg backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      <UnitSummary unit={unit} />
    </div>
  );
}
