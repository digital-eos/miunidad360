import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/units/status-colors";

const PHOTO_SLOTS = 2;

/**
 * Unit card drawn on top of the 3D view, next to its unit. On hover it is a light preview
 * (figures only, so hovering never loads images) that lets the pointer pass through and
 * disappears once the pointer leaves the unit; clicking the unit pins it and adds the
 * interior photos and the actions.
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
        "-translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur-md",
        pinned
          ? "pointer-events-auto w-[min(22rem,calc(100vw-2.5rem))] border-accent"
          : "pointer-events-none w-[min(16rem,calc(100vw-2.5rem))] border-border-subtle",
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

      {pinned ? (
        <>
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
        </>
      ) : (
        <p className="mt-3 text-xs text-foreground-muted">Hacé clic para ver las fotos</p>
      )}
    </div>
  );
}
