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
} from "drizzle-orm/pg-core";

export const unitStatusEnum = pgEnum("unit_status", ["disponible", "reservada", "vendida"]);

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

export const units = pgTable(
  "units",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Stable 3D identifier, e.g. "P04-B" — matches the apartment userData id in the maqueta demo. */
    code: text("code").notNull(),
    floor: integer("floor").notNull(),
    letter: text("letter").notNull(),
    rooms: integer("rooms").notNull(),
    bedrooms: integer("bedrooms").notNull(),
    areaM2: numeric("area_m2", { precision: 6, scale: 2 }).notNull(),
    balconyM2: numeric("balcony_m2", { precision: 6, scale: 2 }).notNull(),
    priceUsd: integer("price_usd").notNull(),
    status: unitStatusEnum("status").notNull().default("disponible"),
    orientation: text("orientation").notNull(),
    planType: text("plan_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("units_project_code_idx").on(table.projectId, table.code)],
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
export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
