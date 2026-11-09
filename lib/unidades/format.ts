import type { Campo } from "./tipos";
import { TIPOS } from "./tipos";
import type { Moneda, Unidad } from "./types";

const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export function formatPrecio(precio: number | null, moneda: Moneda): string {
  if (precio == null) return "Consultar";
  return `${moneda === "USD" ? "USD" : "$"} ${integer.format(precio)}`;
}

export function formatSuperficie(m2: number, formato: "m2" | "ha" = "m2"): string {
  if (formato === "ha") return `${oneDecimal.format(m2 / 10_000)} ha`;
  return `${integer.format(m2)} m²`;
}

function formatDistancia(m: number): string {
  if (m >= 1000) return `${oneDecimal.format(m / 1000)} km`;
  return `${integer.format(m)} m`;
}

/** A field's display value, or null when the unit has no value for it. */
export function formatCampo(campo: Campo, value: unknown): string | null {
  if (value == null || value === "") return null;
  const prefix = campo.prefijo ?? "";

  switch (campo.formato) {
    case "bool":
      return value === true ? "Sí" : value === false ? "No" : null;
    case "texto":
      return `${prefix}${String(value)}`;
  }

  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;

  switch (campo.formato) {
    case "m2":
      return `${prefix}${integer.format(n)} m²`;
    case "m":
      return `${prefix}${oneDecimal.format(n)} m`;
    case "ha":
      return `${prefix}${oneDecimal.format(n)} ha`;
    case "kw":
      return `${prefix}${integer.format(n)} kW`;
    case "coef":
      return `${prefix}${twoDecimals.format(n)}`;
    case "distancia":
      return `${prefix}${formatDistancia(n)}`;
    default:
      return `${prefix}${integer.format(n)}`;
  }
}

/**
 * "el Lote 34" when the code already names the type, "la unidad P04-B" otherwise — for
 * sentences like the WhatsApp message.
 */
export function unidadReferencia(unidad: Unidad): string {
  const config = TIPOS[unidad.tipo];
  const startsWithType = unidad.codigo.toLowerCase().startsWith(config.singular.toLowerCase());
  return startsWithType ? `${config.articulo} ${unidad.codigo}` : `la unidad ${unidad.codigo}`;
}

/** Short one-line summary: "Manzana 3 · 850 m²". */
export function unidadResumen(unidad: Unidad): string {
  const config = TIPOS[unidad.tipo];
  const parts = [
    unidad.sector,
    formatSuperficie(unidad.superficieM2, config.superficieFormato),
  ].filter(Boolean);
  return parts.join(" · ");
}
