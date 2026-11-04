CREATE TYPE "public"."unit_status" AS ENUM('disponible', 'reservada', 'vendida');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"code" text NOT NULL,
	"floor" integer NOT NULL,
	"letter" text NOT NULL,
	"rooms" integer NOT NULL,
	"bedrooms" integer NOT NULL,
	"area_m2" numeric(6, 2) NOT NULL,
	"balcony_m2" numeric(6, 2) NOT NULL,
	"price_usd" integer NOT NULL,
	"status" "unit_status" DEFAULT 'disponible' NOT NULL,
	"orientation" text NOT NULL,
	"plan_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "unit_code" text;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "units_project_code_idx" ON "units" USING btree ("project_id","code");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;