CREATE TYPE "public"."activity_type" AS ENUM('commit', 'pull_request', 'issue');--> statement-breakpoint
CREATE TABLE "github_activity_event" (
	"id" text PRIMARY KEY NOT NULL,
	"project_repository_id" text NOT NULL,
	"project_id" text NOT NULL,
	"member_id" text,
	"github_login" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"external_id" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "github_activity_event_dedupe_unique" UNIQUE("project_repository_id","type","external_id")
);
--> statement-breakpoint
ALTER TABLE "github_activity_event" ADD CONSTRAINT "github_activity_event_project_repository_id_project_repository_id_fk" FOREIGN KEY ("project_repository_id") REFERENCES "public"."project_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_activity_event" ADD CONSTRAINT "github_activity_event_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_activity_event" ADD CONSTRAINT "github_activity_event_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;