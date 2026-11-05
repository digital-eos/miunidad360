/** Light, flat-shaded presentation colors per construction category — kept pastel/clear to match the site's light theme. */
export const CATEGORY_COLORS: Record<string, string> = {
  losas: "#e4dfd2",
  estructura: "#90a4c0",
  muros: "#e8d9b8",
  escaleras: "#c9c2d6",
  barandas: "#78808c",
  revestimientos: "#f1e6cf",
  aberturas: "#aed3e0",
  fachada: "#d98f6c",
  otros: "#b9b4a8",
};

export const CATEGORY_LABELS: Record<string, string> = {
  losas: "Losas",
  estructura: "Estructura",
  muros: "Muros",
  escaleras: "Escaleras",
  barandas: "Barandas",
  revestimientos: "Revestimientos",
  aberturas: "Aberturas",
  fachada: "Fachada",
  otros: "Otros",
};

export const DEFAULT_CATEGORY_COLOR = "#c7c2b4";

/** Categories rendered as tinted glass (semi-transparent, low roughness) instead of a flat opaque color. */
export const GLASS_CATEGORIES = new Set(["aberturas"]);
