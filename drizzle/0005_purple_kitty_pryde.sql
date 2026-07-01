ALTER TABLE "member" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
DROP TYPE "public"."member_status";--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('new', 'active', 'inactive', 'honorary');--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."member_status";--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "status" SET DATA TYPE "public"."member_status" USING "status"::"public"."member_status";--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "study_year" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "study_department" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "hr_notes" text;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "role" text DEFAULT 'członek zespołu' NOT NULL;--> statement-breakpoint
ALTER TABLE "member" DROP COLUMN "study_semester";