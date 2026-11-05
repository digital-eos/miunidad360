import {
  pgEnum,
  pgTable,
  serial,
  integer,
  numeric,
  text,
  timestamp,
  doublePrecision,
  uniqueIndex,
  bigint,
  jsonb,
} from "drizzle-orm/pg-core";

/** Estado comercial de una unidad (el nombre del tipo en Postgres se mantiene por compatibilidad). */
export const estadoEnum = pgEnum("unit_status", ["disponible", "reservada", "vendida"]);

export const tipoUnidadEnum = pgEnum("unidad_tipo", [
  "departamento",
  "cochera",
  "baulera",
  "casa",
  "lote",
  "local",
  "oficina",
  "nave",
  "parcela",
  "cabana",
]);

export const monedaEnum = pgEnum("moneda", ["USD", "ARS"]);

/** Datos propios de cada tipo de unidad (ambientes, frente_m, fos, potencia_kw…). */
export type Atributos = Record<string, string | number | boolean | null>;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Una unidad vendible de un proyecto, sea del tipo que sea: un departamento, un lote, una
 * nave… Los datos comunes son columnas; lo propio de cada tipo va en `atributos`.
 */
export const unidades = pgTable(
  "unidades",
  {
    id: serial("id").primaryKey(),
    proyectoId: integer("proyecto_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tipo: tipoUnidadEnum("tipo").notNull(),
    /** Código visible y estable, p. ej. "UF 12", "P04-B" o "Lote 34". Se usa en ?unidad=. */
    codigo: text("codigo").notNull(),
    /** Piso, manzana o zona, según el tipo. */
    sector: text("sector"),
    superficieM2: numeric("superficie_m2", { precision: 12, scale: 2 }).notNull(),
    superficieTerrenoM2: numeric("superficie_terreno_m2", { precision: 12, scale: 2 }),
    orientacion: text("orientacion"),
    precio: bigint("precio", { mode: "number" }),
    moneda: monedaEnum("moneda").notNull().default("USD"),
    estado: estadoEnum("estado").notNull().default("disponible"),
    /** Nombre del objeto en el modelo 3D (GLB o escena generada), p. ej. "APT-3". */
    objeto3d: text("objeto_3d"),
    atributos: jsonb("atributos").$type<Atributos>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("unidades_proyecto_codigo_idx").on(table.proyectoId, table.codigo)],
);

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  source: text("source").notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  unitCode: text("unit_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type UnidadRow = typeof unidades.$inferSelect;
export type NewUnidad = typeof unidades.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
