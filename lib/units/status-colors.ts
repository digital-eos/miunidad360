import type { UnitStatus } from "@/lib/units/demo-data";

// Status colors come from the brand palette (see app/globals.css):
// sage for available, terracotta for reserved, a neutral warm gray for sold.
export const STATUS_COLORS: Record<UnitStatus, string> = {
  disponible: "#82958a",
  reservada: "#b77b5c",
  vendida: "#b3b1aa",
};

export const STATUS_LABELS: Record<UnitStatus, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
};

export const STATUS_ORDER: UnitStatus[] = ["disponible", "reservada", "vendida"];
