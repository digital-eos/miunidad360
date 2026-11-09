"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackUnitOpened } from "@/lib/analytics";
import { findUnidad, type Unidad } from "@/lib/unidades/types";
import { readUnidadParam, writeUnidadParam } from "@/lib/hooks/use-unidad-param";
import { zeusFloor, zeusUnidades } from "@/lib/zeus/dataset";

/** State shared by the 3D view and the info card: the isolated floor and the open unit. */
export type ZeusViewer = {
  /** Isolated floor, or null for the whole building. */
  floor: number | null;
  unidades: Unidad[];
  /** Units keyed by their 3D object name ("APT-3B"). */
  unidadesByObjeto: Map<string, Unidad>;
  selectedUnit: string | null;
  selectFloor: (floor: number | null) => void;
  openUnit: (objeto3d: string) => void;
  closeUnit: () => void;
};

export function useZeusViewer({ syncUrl = false }: { syncUrl?: boolean } = {}): ZeusViewer {
  const [floor, setFloor] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const unidades = zeusUnidades;

  const unidadesByObjeto = useMemo(
    () => new Map(unidades.map((u) => [u.objeto3d as string, u])),
    [unidades]
  );
  const unidadesRef = useRef(unidadesByObjeto);

  const selectUnit = useCallback(
    (objeto3d: string | null) => {
      setSelectedUnit(objeto3d);
      if (syncUrl) {
        const unidad = objeto3d ? unidadesRef.current.get(objeto3d) : null;
        writeUnidadParam(unidad?.codigo ?? null);
      }
    },
    [syncUrl]
  );

  const selectFloor = useCallback(
    (next: number | null) => {
      setFloor(next);
      if (next === null || !selectedUnit) return;
      const unidad = unidadesRef.current.get(selectedUnit);
      if (!unidad || zeusFloor(unidad) !== next) selectUnit(null);
    },
    [selectedUnit, selectUnit]
  );

  const openUnit = useCallback(
    (objeto3d: string) => {
      const unidad = unidadesRef.current.get(objeto3d);
      if (!unidad) return;
      setFloor(zeusFloor(unidad));
      selectUnit(objeto3d);
      trackUnitOpened("zeus", unidad.codigo);
    },
    [selectUnit]
  );

  const closeUnit = useCallback(() => selectUnit(null), [selectUnit]);

  // Open the unit named in ?unidad= once, on the standalone page.
  useEffect(() => {
    if (!syncUrl) return;
    const unidad = findUnidad(zeusUnidades, readUnidadParam());
    if (unidad?.objeto3d) {
      const id = setTimeout(() => openUnit(unidad.objeto3d as string), 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl]);

  return {
    floor,
    unidades,
    unidadesByObjeto,
    selectedUnit,
    selectFloor,
    openUnit,
    closeUnit,
  };
}
