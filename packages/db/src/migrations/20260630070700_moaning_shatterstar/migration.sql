ALTER TABLE "credentials" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE "credentials_id_seq";--> statement-breakpoint
ALTER TABLE "credentials" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "credentials" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "playbooks" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "playbooks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();