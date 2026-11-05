"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BIM_PROJECT_SLUG, bimFallbackUnidades, unidadFloor } from "@/lib/bim/dataset";
import { LAST_WEEK } from "@/lib/bim/calendar";
import { trackUnitOpened } from "@/lib/analytics";
import { fetchUnidades } from "@/lib/unidades/fetch";
import { findUnidad, type Unidad } from "@/lib/unidades/types";
import { readUnidadParam, writeUnidadParam } from "@/lib/hooks/use-unidad-param";
import type { BimMode } from "./BimModel";

/**
 * State shared between the 3D view and the info card beside it: the mode, the isolated
 * floor (null = whole building), the units and the open one. Lives outside the 3D bundle so
 * the info card can render before the model loads.
 */
export type BimViewer = {
  mode: BimMode;
  floor: number | null;
  /** Units of the project (from the database, or the demo's built-in copy until it answers). */
  unidades: Unidad[];
  /** Same units keyed by their 3D object name ("APT-3"). */
  unidadesByObjeto: Map<string, Unidad>;
  /** 3D object name of the open unit. */
  selectedUnit: string | null;
  selectMode: (mode: BimMode) => void;
  selectFloor: (floor: number | null) => void;
  /** Opens a unit's card by its 3D object name and isolates its floor. */
  openUnit: (objeto3d: string) => void;
  closeUnit: () => void;
  /** Construction week shown in "avance" mode, and its playback. */
  currentWeek: number;
  isPlaying: boolean;
  changeWeek: (week: number) => void;
  togglePlay: () => void;
  completeBuild: () => void;
};

const PLAY_INTERVAL_MS = 450;

export function useBimViewer({
  initialMode = "unidades",
  initialFloor = null,
  syncUrl = false,
}: {
  initialMode?: BimMode;
  initialFloor?: number | null;
  /** Read and write ?unidad=<código> (standalone demo page only). */
  syncUrl?: boolean;
} = {}): BimViewer {
  const [mode, setMode] = useState<BimMode>(initialMode);
  const [floor, setFloor] = useState<number | null>(initialFloor);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(LAST_WEEK);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unidades, setUnidades] = useState<Unidad[]>(bimFallbackUnidades);

  const unidadesByObjeto = useMemo(
    () => new Map(unidades.filter((u) => u.objeto3d).map((u) => [u.objeto3d as string, u])),
    [unidades]
  );
  const unidadesRef = useRef(unidadesByObjeto);
  useEffect(() => {
    unidadesRef.current = unidadesByObjeto;
  }, [unidadesByObjeto]);

  // Live prices and statuses from the database; keep the built-in copy if it fails.
  useEffect(() => {
    let cancelled = false;
    fetchUnidades(BIM_PROJECT_SLUG)
      .then((data) => {
        if (!cancelled && data.unidades.length > 0) setUnidades(data.unidades);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentWeek((w) => {
        if (w >= LAST_WEEK) {
          setIsPlaying(false);
          return w;
        }
        return w + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying]);

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

  const selectMode = useCallback(
    (next: BimMode) => {
      setMode(next);
      selectUnit(null);
      setIsPlaying(false);
    },
    [selectUnit]
  );

  const changeWeek = useCallback((week: number) => {
    setIsPlaying(false);
    setCurrentWeek(week);
  }, []);

  const togglePlay = useCallback(() => {
    setCurrentWeek((w) => (w >= LAST_WEEK ? 0 : w));
    setIsPlaying((p) => !p);
  }, []);

  const completeBuild = useCallback(() => {
    setIsPlaying(false);
    setCurrentWeek(LAST_WEEK);
  }, []);

  const selectFloor = useCallback(
    (next: number | null) => {
      setFloor(next);
      if (next === null || !selectedUnit) return;
      const unidad = unidadesRef.current.get(selectedUnit);
      if (!unidad || unidadFloor(unidad) !== next) selectUnit(null);
    },
    [selectedUnit, selectUnit]
  );

  const openUnit = useCallback(
    (objeto3d: string) => {
      const unidad = unidadesRef.current.get(objeto3d);
      if (!unidad) return;
      // "Corte" keeps its plan view; the construction timeline has no units, so it
      // switches to "Unidades".
      setMode((m) => (m === "avance" ? "unidades" : m));
      setFloor(unidadFloor(unidad));
      selectUnit(objeto3d);
      trackUnitOpened("bim", unidad.codigo);
    },
    [selectUnit]
  );

  const closeUnit = useCallback(() => selectUnit(null), [selectUnit]);

  // Open the unit named in ?unidad= once, on the standalone page.
  useEffect(() => {
    if (!syncUrl) return;
    const unidad = findUnidad(bimFallbackUnidades, readUnidadParam());
    if (unidad?.objeto3d) {
      const id = setTimeout(() => openUnit(unidad.objeto3d as string), 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl]);

  return {
    mode,
    floor,
    unidades,
    unidadesByObjeto,
    selectedUnit,
    selectMode,
    selectFloor,
    openUnit,
    closeUnit,
    currentWeek,
    isPlaying,
    changeWeek,
    togglePlay,
    completeBuild,
  };
}
