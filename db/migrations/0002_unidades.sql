-- Reemplaza la tabla "units" (solo departamentos) por "unidades", válida para cualquier tipo
-- de unidad. Copia todas las filas existentes antes de borrar la tabla vieja.
CREATE TYPE "public"."moneda" AS ENUM('USD', 'ARS');--> statement-breakpoint
CREATE TYPE "public"."unidad_tipo" AS ENUM('departamento', 'cochera', 'baulera', 'casa', 'lote', 'local', 'oficina', 'nave', 'parcela', 'cabana');--> statement-breakpoint
CREATE TABLE "unidades" (
	"id" serial PRIMARY KEY NOT NULL,
	"proyecto_id" integer NOT NULL,
	"tipo" "unidad_tipo" NOT NULL,
	"codigo" text NOT NULL,
	"sector" text,
	"superficie_m2" numeric(12, 2) NOT NULL,
	"superficie_terreno_m2" numeric(12, 2),
	"orientacion" text,
	"precio" bigint,
	"moneda" "moneda" DEFAULT 'USD' NOT NULL,
	"estado" "unit_status" DEFAULT 'disponible' NOT NULL,
	"objeto_3d" text,
	"atributos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_proyecto_id_projects_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_proyecto_codigo_idx" ON "unidades" USING btree ("proyecto_id","codigo");--> statement-breakpoint
INSERT INTO "unidades" (
	"proyecto_id", "tipo", "codigo", "sector", "superficie_m2", "orientacion", "precio", "moneda",
	"estado", "objeto_3d", "atributos", "created_at", "updated_at"
)
SELECT
	"project_id",
	'departamento',
	"code",
	'Piso ' || "floor",
	"area_m2",
	"orientation",
	"price_usd",
	'USD',
	"status",
	"code",
	jsonb_build_object(
		'piso', "floor",
		'letra', "letter",
		'ambientes', "rooms",
		'dormitorios', "bedrooms",
		'balcon_m2', "balcony_m2"::double precision,
		'tipologia', "plan_type"
	),
	"created_at",
	"updated_at"
FROM "units"
ORDER BY "project_id", "floor", "letter";--> statement-breakpoint
DROP TABLE "units";
