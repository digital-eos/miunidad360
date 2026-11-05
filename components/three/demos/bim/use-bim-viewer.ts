"use client";

import { useCallback, useEffect, useState } from "react";
import { bimUnitsByName } from "@/lib/bim/dataset";
import { LAST_WEEK } from "@/lib/bim/calendar";
import { trackUnitOpened } from "@/lib/analytics";
import type { BimMode } from "./BimModel";

/**
 * State shared between the 3D view and the info card beside it: the mode, the isolated
 * floor (null = whole building) and the open unit. Lives outside the 3D bundle so the info
 * card can render before the model loads.
 */
export type BimViewer = {
  mode: BimMode;
  floor: number | null;
  selectedUnit: string | null;
  selectMode: (mode: BimMode) => void;
  selectFloor: (floor: number | null) => void;
  /** Opens a unit's card, switching to "unidades" and isolating its floor. */
  openUnit: (name: string) => void;
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
}: { initialMode?: BimMode; initialFloor?: number | null } = {}): BimViewer {
  const [mode, setMode] = useState<BimMode>(initialMode);
  const [floor, setFloor] = useState<number | null>(initialFloor);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(LAST_WEEK);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const selectMode = useCallback((next: BimMode) => {
    setMode(next);
    setSelectedUnit(null);
    setIsPlaying(false);
  }, []);

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

  const selectFloor = useCallback((next: number | null) => {
    setFloor(next);
    setSelectedUnit((current) => {
      if (!current || next === null) return current;
      return bimUnitsByName.get(current)?.floor === next ? current : null;
    });
  }, []);

  const openUnit = useCallback((name: string) => {
    const unit = bimUnitsByName.get(name);
    if (!unit) return;
    setMode("unidades");
    setFloor(unit.floor);
    setSelectedUnit(name);
    trackUnitOpened("bim", name);
  }, []);

  const closeUnit = useCallback(() => setSelectedUnit(null), []);

  return {
    mode,
    floor,
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
