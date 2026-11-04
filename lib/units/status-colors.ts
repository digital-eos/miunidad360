import type { UnitStatus } from "@/lib/units/demo-data";

export const STATUS_COLORS: Record<UnitStatus, string> = {
  disponible: "#5fbf7a",
  reservada: "#f0a63b",
  vendida: "#d9726b",
};

export const STATUS_LABELS: Record<UnitStatus, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
};

export const STATUS_ORDER: UnitStatus[] = ["disponible", "reservada", "vendida"];
