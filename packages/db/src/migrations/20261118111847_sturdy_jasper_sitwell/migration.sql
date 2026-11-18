ALTER TABLE "credentials" ADD COLUMN "scope" text DEFAULT 'host' NOT NULL;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "type" text DEFAULT 'ssh_key' NOT NULL;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "credentials" ALTER COLUMN "private_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "credentials" ALTER COLUMN "public_key" DROP NOT NULL;--> statement-breakpoint
-- Keys that only repositories use were deploy keys: they belong to Git now.
-- A key shared with a device stays a host credential.
UPDATE "credentials" SET "scope" = 'git'
WHERE "id" IN (
  SELECT "credential_id" FROM "playbook_repositories" WHERE "credential_id" IS NOT NULL
)
AND "id" NOT IN (
  SELECT "credential_id" FROM "inventory_devices" WHERE "credential_id" IS NOT NULL
);
