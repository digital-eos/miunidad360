"use client";

import { FichaUnidad } from "@/components/unidades/FichaUnidad";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { FloorPlanSvg } from "./FloorPlanSvg";

/** The selector's side panel (bottom sheet on mobile): the shared ficha plus plan and sun. */
export function UnitPanel({
  unit,
  projectSlug,
  projectName,
  onClose,
  sunHoursVerano,
  sunHoursInvierno,
}: {
  unit: Unidad;
  projectSlug: string;
  projectName: string;
  onClose: () => void;
  sunHoursVerano?: number | null;
  sunHoursInvierno?: number | null;
}) {
  const bedrooms = attrNumber(unit, "dormitorios") ?? 1;
  const balconyM2 = attrNumber(unit, "balcon_m2") ?? 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border-subtle bg-background sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0">
      <FichaUnidad
        key={unit.codigo}
        unidad={unit}
        proyectoSlug={projectSlug}
        proyectoNombre={projectName}
        source="selector-unidad"
        onClose={onClose}
        nota="Edificio Demo es un proyecto ficticio, creado solo para esta demo."
        media={
          <div className="rounded-xl border border-border-subtle bg-background-elevated p-3">
            <FloorPlanSvg
              bedrooms={bedrooms}
              areaM2={unit.superficieM2}
              balconyM2={balconyM2}
              className="w-full"
            />
          </div>
        }
      >
        {sunHoursVerano != null || sunHoursInvierno != null ? (
          <div className="rounded-xl border border-border-subtle bg-background-elevated p-3">
            <p className="text-xs font-medium text-foreground-muted">Sol directo en la fachada</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-foreground-muted">Verano</p>
                <p>{sunHoursVerano != null ? `${sunHoursVerano.toFixed(1)} h` : "calculando…"}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Invierno</p>
                <p>
                  {sunHoursInvierno != null ? `${sunHoursInvierno.toFixed(1)} h` : "calculando…"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </FichaUnidad>
    </div>
  );
}
