CREATE TABLE "board_term" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_term_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "board_settings" (
	"id" text DEFAULT 'singleton' PRIMARY KEY NOT NULL,
	"active_board_term_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_settings_singleton_unique" UNIQUE("id"),
	CONSTRAINT "board_settings_singleton_check" CHECK ("board_settings"."id" = 'singleton')
);
--> statement-breakpoint
INSERT INTO "role_definition" ("id", "scope", "name") VALUES
	(gen_random_uuid()::text, 'board', 'prezes'),
	(gen_random_uuid()::text, 'board', 'wiceprezes'),
	(gen_random_uuid()::text, 'board', 'sekretarz')
ON CONFLICT ("scope", "name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_definition_permission_group" ("id", "role_definition_id", "permission_group_id")
SELECT gen_random_uuid()::text, rd."id", pg."id"
FROM "role_definition" rd
CROSS JOIN "permission_group" pg
WHERE rd."scope" = 'board'
	AND pg."name" = 'Zarząd'
ON CONFLICT ("role_definition_id", "permission_group_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "board_term" ("id", "name", "starts_at", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'Zaimportowana kadencja', '2000-01-01'::timestamp, now(), now())
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "board_settings" ("id", "active_board_term_id", "updated_at")
SELECT 'singleton', "id", now()
FROM "board_term"
WHERE "name" = 'Zaimportowana kadencja'
ON CONFLICT ("id") DO UPDATE SET
	"active_board_term_id" = EXCLUDED."active_board_term_id",
	"updated_at" = now();
--> statement-breakpoint
ALTER TABLE "role_assignment" ADD COLUMN "board_term_id" text;
--> statement-breakpoint
UPDATE "role_assignment"
SET "board_term_id" = (SELECT "active_board_term_id" FROM "board_settings" WHERE "id" = 'singleton')
WHERE "role_definition_id" IN (
	SELECT "id" FROM "role_definition" WHERE "scope" = 'board'
)
	AND "board_term_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "board_settings" ADD CONSTRAINT "board_settings_active_board_term_id_board_term_id_fk" FOREIGN KEY ("active_board_term_id") REFERENCES "public"."board_term"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_board_term_id_board_term_id_fk" FOREIGN KEY ("board_term_id") REFERENCES "public"."board_term"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_assignment" DROP CONSTRAINT "role_assignment_single_target_check";
--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_single_target_check" CHECK (num_nonnulls("board_term_id", "section_id", "project_id") <= 1);
