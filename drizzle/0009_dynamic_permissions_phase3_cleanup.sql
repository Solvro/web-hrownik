ALTER TABLE "team_member" ALTER COLUMN "role_definition_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_member" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "role_definition" DROP COLUMN "permission_level";--> statement-breakpoint
DROP TYPE "public"."permission_level";