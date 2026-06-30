ALTER TABLE "job_runs" ADD COLUMN "trigger" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN "events_json" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN "error" text;