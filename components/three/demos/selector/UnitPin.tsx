import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

const PHOTO_SLOTS = 2;

/**
 * Unit card drawn on top of the 3D view. On hover it is a light preview next to its unit
 * (figures only, so hovering never loads images) that lets the pointer pass through and
 * disappears once the pointer leaves the unit; clicking the unit pins it, docked in a
 * corner of the view by its parent, with the interior photos and the actions.
 */
export function UnitPin({
  unit,
  photos,
  pinned,
  onView,
  onClose,
}: {
  unit: Unidad;
  /** Interior photo URLs; the first two are shown. */
  photos: string[];
  pinned: boolean;
  onView?: () => void;
  onClose?: () => void;
}) {
  const rooms = attrNumber(unit, "ambientes");
  const action = (handler?: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    handler?.();
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface shadow-[var(--shadow-panel)]",
        pinned
          ? "pointer-events-auto w-full border-primary p-4 md:w-[30rem] md:p-5"
          : "pointer-events-none w-[min(16rem,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-[calc(100%+12px)] border-border-subtle p-4",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("tabular-nums text-foreground-muted", pinned ? "text-base" : "text-sm")}>
          {unit.codigo}
        </span>
        <StatusBadge status={unit.estado} size={pinned ? "md" : "sm"} />
      </div>
      <p className={cn("mt-1 font-display", pinned ? "text-2xl md:text-3xl" : "text-2xl")}>
        {formatPrecio(unit.precio, unit.moneda)}
      </p>
      <p className={cn("mt-0.5 text-foreground-muted", pinned ? "text-base" : "text-sm")}>
        {rooms != null ? `${rooms} amb · ` : ""}
        {formatArea(unit.superficieM2)}
        {unit.orientacion ? ` · ${unit.orientacion}` : ""}
      </p>

      {pinned ? (
        <>
          {/* Phones skip the photos: the panel under the view shows the unit in full. */}
          <div className="mt-4 hidden grid-cols-2 gap-3 md:grid">
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
                  className="aspect-[4/3] w-full rounded-lg border border-dashed border-border-subtle bg-surface-muted"
                />
              ),
            )}
          </div>

          <div className="mt-4 flex gap-3 md:mt-5">
            <button
              type="button"
              onClick={action(onView)}
              className="btn btn-primary btn-sm flex-1"
            >
              Ver
            </button>
            <button
              type="button"
              onClick={action(onClose)}
              className="btn btn-secondary btn-sm flex-1"
            >
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-foreground-muted">Hacé clic para ver las fotos</p>
      )}
    </div>
  );
}
