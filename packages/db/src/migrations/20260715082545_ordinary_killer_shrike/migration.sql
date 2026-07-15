CREATE TABLE "playbook_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "playbooks" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_folder_id_playbook_folders_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "playbook_folders"("id") ON DELETE SET NULL;