import type { Unidad } from "@/lib/unidades/types";
import type { UnitStatus } from "@/lib/units/demo-data";
import { LOTE_GEOMS, seeded, type LoteGeom } from "./barrio";

export const LOTES_PROJECT_SLUG = "barrio-demo";
export const LOTES_PROJECT_NAME = "Barrio Demo";

/** Illustrative USD/m² for a lot in a gated neighbourhood, before premiums. */
const BASE_USD_M2 = 105;

function precioLote(lote: LoteGeom): number {
  let factor = 1;
  if (lote.frenteLaguna) factor += 0.4;
  else factor += 0.1 * (1 - Math.min(lote.distanciaLagunaM, 250) / 250);
  if (lote.esquina) factor += 0.06;
  if (lote.orientacion === "N") factor += 0.04;
  factor += 0.08 * (1 - Math.min(lote.distanciaClubHouseM, 300) / 300);
  return Math.round((lote.superficieM2 * BASE_USD_M2 * factor) / 500) * 500;
}

/**
 * Deterministic status mix, about half available. Lagoon-front and corner lots tend to sell
 * first, as they would in a real launch.
 */
function estadosLotes(lotes: LoteGeom[]): Map<string, UnitStatus> {
  const scored = lotes
    .map((l) => ({
      codigo: l.codigo,
      score: seeded(l.numero * 13.37) - (l.frenteLaguna ? 0.35 : 0) - (l.esquina ? 0.1 : 0),
    }))
    .sort((a, b) => a.score - b.score);
  const vendidas = Math.round(lotes.length * 0.35);
  const reservadas = Math.round(lotes.length * 0.15);
  const result = new Map<string, UnitStatus>();
  scored.forEach((s, i) => {
    result.set(s.codigo, i < vendidas ? "vendida" : i < vendidas + reservadas ? "reservada" : "disponible");
  });
  return result;
}

/** The Barrio Demo lots as `unidades`: what db/seed.ts stores and the demo's offline copy. */
export function buildLotesUnidades(proyectoId = 0): Unidad[] {
  const estados = estadosLotes(LOTE_GEOMS);
  return LOTE_GEOMS.map((lote, index) => {
    const grande = lote.superficieM2 >= 1000;
    return {
      id: -(index + 1),
      proyectoId,
      tipo: "lote",
      codigo: lote.codigo,
      sector: `Manzana ${lote.manzana}`,
      superficieM2: lote.superficieM2,
      superficieTerrenoM2: null,
      orientacion: lote.orientacion,
      precio: precioLote(lote),
      moneda: "USD",
      estado: estados.get(lote.codigo) ?? "disponible",
      objeto3d: lote.codigo,
      atributos: {
        manzana: lote.manzana,
        frente_m: lote.frenteM,
        fondo_m: lote.fondoM,
        esquina: lote.esquina,
        frente_laguna: lote.frenteLaguna,
        distancia_laguna_m: lote.distanciaLagunaM,
        distancia_club_house_m: lote.distanciaClubHouseM,
        fos: grande ? 0.35 : 0.3,
        fot: grande ? 0.6 : 0.5,
      },
    };
  });
}
