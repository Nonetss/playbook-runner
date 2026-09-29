CREATE TABLE "playbook_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"url" text NOT NULL,
	"branch" text DEFAULT 'main' NOT NULL,
	"subdir" text,
	"credential_id" uuid,
	"last_commit_sha" text,
	"last_synced_at" timestamp,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN "commit_sha" text;--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "source" text DEFAULT 'inline' NOT NULL;--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "repository_id" uuid;--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "path" text;--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "missing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_repository_path_unique" UNIQUE("repository_id","path");--> statement-breakpoint
ALTER TABLE "playbook_repositories" ADD CONSTRAINT "playbook_repositories_credential_id_credentials_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "credentials"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_repository_id_playbook_repositories_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "playbook_repositories"("id") ON DELETE CASCADE;