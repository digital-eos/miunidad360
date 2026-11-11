ALTER TABLE "projects" ADD COLUMN "privado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "password_hash" text;