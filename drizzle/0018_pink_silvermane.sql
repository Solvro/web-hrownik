CREATE TABLE "project_status" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"status" "project_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_status" ADD CONSTRAINT "project_status_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "project_status" ("id", "project_id", "status", "created_at")
SELECT gen_random_uuid()::text, "id", "status", "created_at"
FROM "project";
--> statement-breakpoint
UPDATE "project" SET "started_at" = "created_at" WHERE "started_at" IS NULL;
