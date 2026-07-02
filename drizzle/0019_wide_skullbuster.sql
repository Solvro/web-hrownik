CREATE TABLE "github_external_contributor" (
	"id" text PRIMARY KEY NOT NULL,
	"github_login" text NOT NULL,
	"type" text DEFAULT 'external_contributor' NOT NULL,
	"noted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_external_contributor_login_unique" UNIQUE("github_login")
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "leaderboard_limit" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "leaderboard_include_external" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "leaderboard_include_bots" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
INSERT INTO "github_external_contributor" ("id", "github_login", "type")
SELECT
  gen_random_uuid()::text,
  distinct_login."github_login",
  CASE
    WHEN lower(distinct_login."github_login") LIKE '%bot%' THEN 'bot'
    ELSE 'external_contributor'
  END
FROM (
  SELECT DISTINCT "github_activity_event"."github_login"
  FROM "github_activity_event"
  LEFT JOIN "member"
    ON lower("member"."github_username") = lower("github_activity_event"."github_login")
  WHERE "member"."id" IS NULL
) AS distinct_login
ON CONFLICT ("github_login") DO NOTHING;
