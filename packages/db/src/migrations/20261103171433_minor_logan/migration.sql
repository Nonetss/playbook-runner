CREATE TABLE "infisical_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"url" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "infisical_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_infisical_connection_id_infisical_connections_id_fkey" FOREIGN KEY ("infisical_connection_id") REFERENCES "infisical_connections"("id") ON DELETE RESTRICT;