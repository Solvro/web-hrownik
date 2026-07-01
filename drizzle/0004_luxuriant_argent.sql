CREATE TABLE "team_repository" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"project_repository_id" text NOT NULL,
	CONSTRAINT "team_repository_team_repo_unique" UNIQUE("team_id","project_repository_id")
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "project_card_drive_url" text;--> statement-breakpoint
ALTER TABLE "team_repository" ADD CONSTRAINT "team_repository_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_repository" ADD CONSTRAINT "team_repository_project_repository_id_project_repository_id_fk" FOREIGN KEY ("project_repository_id") REFERENCES "public"."project_repository"("id") ON DELETE cascade ON UPDATE no action;