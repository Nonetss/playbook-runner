CREATE TABLE "job_secret_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" uuid NOT NULL,
	"variable_name" text NOT NULL,
	"secret_name" text NOT NULL,
	"secret_path" text DEFAULT '/' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "job_secret_variables_job_variable_unique" UNIQUE("job_id","variable_name")
);
--> statement-breakpoint
CREATE TABLE "playbook_secret_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"playbook_id" uuid NOT NULL,
	"variable_name" text NOT NULL,
	"secret_name" text NOT NULL,
	"secret_path" text DEFAULT '/' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "playbook_secret_variables_playbook_variable_unique" UNIQUE("playbook_id","variable_name")
);
--> statement-breakpoint
ALTER TABLE "infisical_connections" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "infisical_environment" text;--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "infisical_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "infisical_environment" text;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_infisical_connection_id_infisical_connections_id_fkey" FOREIGN KEY ("infisical_connection_id") REFERENCES "infisical_connections"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "job_secret_variables" ADD CONSTRAINT "job_secret_variables_job_id_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "playbook_secret_variables" ADD CONSTRAINT "playbook_secret_variables_playbook_id_playbooks_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "playbooks"("id") ON DELETE CASCADE;