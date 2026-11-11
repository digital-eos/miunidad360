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
  boolean,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

// ---- Cuentas de clientes ----

export const clienteTipoEnum = pgEnum("cliente_tipo", [
  "desarrolladora",
  "estudio",
  "loteo",
]);
export const usuarioRolEnum = pgEnum("usuario_rol", ["superadmin", "cliente"]);

/** Una empresa cliente (desarrolladora, estudio, loteo). Es dueña de sus proyectos. */
export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: clienteTipoEnum("tipo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Personas que entran a /admin con un link mágico. No hay alta pública: solo un superadmin
 * crea usuarios. Un `cliente` siempre pertenece a un cliente; un `superadmin` a ninguno.
 * `emailVerified` e `imagen` los pide Better Auth (lib/auth/server.ts).
 */
export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    /** Siempre en minúsculas. */
    email: text("email").notNull().unique(),
    nombre: text("nombre").notNull(),
    rol: usuarioRolEnum("rol").notNull().default("cliente"),
    clienteId: integer("cliente_id").references(() => clientes.id, {
      onDelete: "restrict",
    }),
    emailVerified: boolean("email_verified").notNull().default(false),
    imagen: text("imagen"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("usuarios_cliente_idx").on(table.clienteId),
    check(
      "usuarios_rol_cliente_check",
      sql`(${table.rol} = 'cliente') = (${table.clienteId} IS NOT NULL)`
    ),
  ]
);

/** Sesiones de Better Auth (cookie httpOnly; se revocan borrando la fila). */
export const sesiones = pgTable(
  "sesiones",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sesiones_usuario_idx").on(table.usuarioId)]
);

/** Tabla de cuentas que exige Better Auth; con link mágico queda sin uso. */
export const cuentas = pgTable(
  "cuentas",
  {
    id: serial("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cuentas_usuario_idx").on(table.usuarioId)]
);

/** Tokens de los links mágicos (un solo uso, vencen a los 15 minutos). */
export const verificaciones = pgTable(
  "verificaciones",
  {
    id: serial("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verificaciones_identifier_idx").on(table.identifier)]
);

// ---- Proyectos ----

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    description: text("description"),
    /** Privado: la página del proyecto no se indexa ni figura en el sitemap. */
    privado: boolean("privado").notNull().default(false),
    /** Hash scrypt de la contraseña de acceso (lib/proyectos/acceso.ts). Null = sin contraseña. */
    passwordHash: text("password_hash"),
    /** Cliente dueño. Null = proyecto de demo: solo lo gestiona un superadmin. */
    clienteId: integer("cliente_id").references(() => clientes.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("projects_cliente_idx").on(table.clienteId)]
);

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
  (table) => [
    uniqueIndex("unidades_proyecto_codigo_idx").on(table.proyectoId, table.codigo),
  ]
);

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  source: text("source").notNull(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  unitCode: text("unit_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type UnidadRow = typeof unidades.$inferSelect;
export type NewUnidad = typeof unidades.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Cliente = typeof clientes.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type Rol = Usuario["rol"];
