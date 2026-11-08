import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";

const PHOTO_SLOTS = 2;

/**
 * Unit card drawn on top of the 3D view, above its unit: figures, interior photos and
 * actions. Shown as a preview after a hover, or pinned after a click. Clicking a preview
 * pins it.
 */
export function UnitPin({
  unit,
  photos,
  pinned,
  onPin,
  onView,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: {
  unit: Unidad;
  /** Interior photo URLs; the first two are shown. */
  photos: string[];
  pinned: boolean;
  /** Called when a preview card is clicked. */
  onPin?: () => void;
  onView?: () => void;
  onClose: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const rooms = attrNumber(unit, "ambientes");
  const action = (handler?: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    handler?.();
  };

  return (
    <div
      onClick={pinned ? undefined : onPin}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={cn(
        "pointer-events-auto w-[min(22rem,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur-md",
        pinned ? "border-accent" : "cursor-pointer border-border-subtle",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-foreground-muted">{unit.codigo}</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${STATUS_COLORS[unit.estado]}26`,
            color: STATUS_COLORS[unit.estado],
          }}
        >
          {STATUS_LABELS[unit.estado]}
        </span>
      </div>
      <p className="mt-1 font-display text-2xl">{formatPrecio(unit.precio, unit.moneda)}</p>
      <p className="mt-0.5 text-sm text-foreground-muted">
        {rooms != null ? `${rooms} amb · ` : ""}
        {formatArea(unit.superficieM2)}
        {unit.orientacion ? ` · ${unit.orientacion}` : ""}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {Array.from({ length: PHOTO_SLOTS }, (_, i) =>
          photos[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={photos[i]}
              alt={`${unit.codigo}, foto ${i + 1}`}
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
          ) : (
            <div
              key={i}
              aria-hidden
              className="aspect-[4/3] w-full rounded-lg border border-dashed border-border-subtle bg-background-elevated"
            />
          ),
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={action(onView)}
          className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity duration-200 hover:opacity-90"
        >
          Ver
        </button>
        <button
          type="button"
          onClick={action(onClose)}
          className="flex-1 rounded-full border border-border-subtle px-4 py-2 text-sm font-medium text-foreground-muted transition-colors duration-200 hover:border-accent hover:text-foreground"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
