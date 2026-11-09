import type { UnidadTipo } from "./types";

/**
 * How each unit type is labelled in the "ficha de unidad". Add a type, or a field to a type,
 * here — the card picks it up without code changes. Keys of `campos` match `atributos` in the
 * `unidades` table.
 */
export type CampoFormato =
  | "m2"
  | "m"
  | "ha"
  | "entero"
  | "texto"
  | "bool"
  | "kw"
  | "coef"
  | "distancia";

export type Campo = {
  clave: string;
  etiqueta: string;
  formato: CampoFormato;
  /** Text placed before the value, e.g. "Tipo " for a typology letter. */
  prefijo?: string;
};

export type TipoConfig = {
  singular: string;
  plural: string;
  /** Article used in sentences: "el lote", "la casa". */
  articulo: "el" | "la";
  /** What `sector` means for this type: "Piso", "Manzana", "Zona"… */
  sectorEtiqueta: string;
  superficieEtiqueta: string;
  /** Unit used to show the main surface (fields stay in m²). */
  superficieFormato?: "m2" | "ha";
  terrenoEtiqueta?: string;
  campos: Campo[];
};

export const TIPOS: Record<UnidadTipo, TipoConfig> = {
  departamento: {
    singular: "Departamento",
    plural: "Departamentos",
    articulo: "el",
    sectorEtiqueta: "Piso",
    superficieEtiqueta: "Superficie cubierta",
    campos: [
      { clave: "ambientes", etiqueta: "Ambientes", formato: "entero" },
      { clave: "dormitorios", etiqueta: "Dormitorios", formato: "entero" },
      { clave: "banos", etiqueta: "Baños", formato: "entero" },
      { clave: "balcon_m2", etiqueta: "Balcón", formato: "m2" },
      { clave: "patio_m2", etiqueta: "Patio", formato: "m2" },
      { clave: "tipologia", etiqueta: "Tipología", formato: "texto", prefijo: "Tipo " },
    ],
  },
  cochera: {
    singular: "Cochera",
    plural: "Cocheras",
    articulo: "la",
    sectorEtiqueta: "Nivel",
    superficieEtiqueta: "Superficie",
    campos: [
      { clave: "cubierta", etiqueta: "Cubierta", formato: "bool" },
      { clave: "ancho_m", etiqueta: "Ancho", formato: "m" },
      { clave: "largo_m", etiqueta: "Largo", formato: "m" },
    ],
  },
  baulera: {
    singular: "Baulera",
    plural: "Bauleras",
    articulo: "la",
    sectorEtiqueta: "Nivel",
    superficieEtiqueta: "Superficie",
    campos: [{ clave: "altura_m", etiqueta: "Altura", formato: "m" }],
  },
  casa: {
    singular: "Casa",
    plural: "Casas",
    articulo: "la",
    sectorEtiqueta: "Sector",
    superficieEtiqueta: "Superficie cubierta",
    terrenoEtiqueta: "Terreno",
    campos: [
      { clave: "dormitorios", etiqueta: "Dormitorios", formato: "entero" },
      { clave: "banos", etiqueta: "Baños", formato: "entero" },
      { clave: "plantas", etiqueta: "Plantas", formato: "entero" },
      { clave: "jardin_m2", etiqueta: "Jardín", formato: "m2" },
      { clave: "cochera", etiqueta: "Cochera", formato: "bool" },
    ],
  },
  lote: {
    singular: "Lote",
    plural: "Lotes",
    articulo: "el",
    sectorEtiqueta: "Manzana",
    superficieEtiqueta: "Superficie",
    campos: [
      { clave: "frente_m", etiqueta: "Frente", formato: "m" },
      { clave: "fondo_m", etiqueta: "Fondo", formato: "m" },
      { clave: "esquina", etiqueta: "Lote de esquina", formato: "bool" },
      { clave: "frente_laguna", etiqueta: "Frente a la laguna", formato: "bool" },
      { clave: "distancia_laguna_m", etiqueta: "A la laguna", formato: "distancia" },
      { clave: "distancia_club_house_m", etiqueta: "Al club house", formato: "distancia" },
      { clave: "fos", etiqueta: "FOS", formato: "coef" },
      { clave: "fot", etiqueta: "FOT", formato: "coef" },
    ],
  },
  local: {
    singular: "Local",
    plural: "Locales",
    articulo: "el",
    sectorEtiqueta: "Planta",
    superficieEtiqueta: "Superficie",
    campos: [
      { clave: "frente_m", etiqueta: "Frente", formato: "m" },
      { clave: "rubro", etiqueta: "Rubro", formato: "texto" },
      { clave: "vidriera", etiqueta: "Vidriera", formato: "bool" },
    ],
  },
  oficina: {
    singular: "Oficina",
    plural: "Oficinas",
    articulo: "la",
    sectorEtiqueta: "Piso",
    superficieEtiqueta: "Superficie",
    campos: [
      { clave: "puestos", etiqueta: "Puestos de trabajo", formato: "entero" },
      { clave: "banos", etiqueta: "Baños", formato: "entero" },
      { clave: "cocheras", etiqueta: "Cocheras", formato: "entero" },
    ],
  },
  nave: {
    singular: "Nave",
    plural: "Naves",
    articulo: "la",
    sectorEtiqueta: "Sector",
    superficieEtiqueta: "Superficie cubierta",
    terrenoEtiqueta: "Terreno",
    campos: [
      { clave: "altura_libre_m", etiqueta: "Altura libre", formato: "m" },
      { clave: "potencia_kw", etiqueta: "Potencia", formato: "kw" },
      { clave: "portones", etiqueta: "Portones", formato: "entero" },
      { clave: "muelles", etiqueta: "Muelles de carga", formato: "entero" },
    ],
  },
  parcela: {
    singular: "Parcela",
    plural: "Parcelas",
    articulo: "la",
    sectorEtiqueta: "Zona",
    superficieEtiqueta: "Superficie",
    superficieFormato: "ha",
    campos: [
      { clave: "aptitud", etiqueta: "Aptitud", formato: "texto" },
      { clave: "accesos", etiqueta: "Accesos", formato: "texto" },
      { clave: "agua", etiqueta: "Agua", formato: "bool" },
    ],
  },
  cabana: {
    singular: "Cabaña",
    plural: "Cabañas",
    articulo: "la",
    sectorEtiqueta: "Zona",
    superficieEtiqueta: "Superficie",
    campos: [
      { clave: "huespedes", etiqueta: "Huéspedes", formato: "entero" },
      { clave: "dormitorios", etiqueta: "Dormitorios", formato: "entero" },
      { clave: "vista", etiqueta: "Vista", formato: "texto" },
    ],
  },
};
