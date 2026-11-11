CREATE TYPE "public"."cliente_tipo" AS ENUM('desarrolladora', 'estudio', 'loteo');--> statement-breakpoint
CREATE TYPE "public"."usuario_rol" AS ENUM('superadmin', 'cliente');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "cliente_tipo" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuentas" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesiones_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"rol" "usuario_rol" DEFAULT 'cliente' NOT NULL,
	"cliente_id" integer,
	"email_verified" boolean DEFAULT false NOT NULL,
	"imagen" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_rol_cliente_check" CHECK (("usuarios"."rol" = 'cliente') = ("usuarios"."cliente_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "verificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cliente_id" integer;--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cuentas_usuario_idx" ON "cuentas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "sesiones_usuario_idx" ON "sesiones" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "usuarios_cliente_idx" ON "usuarios" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "verificaciones_identifier_idx" ON "verificaciones" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_cliente_idx" ON "projects" USING btree ("cliente_id");