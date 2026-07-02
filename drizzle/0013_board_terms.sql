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
INSERT INTO "board_term" ("id", "name", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'Zaimportowana kadencja', now(), now());
--> statement-breakpoint
INSERT INTO "board_settings" ("id", "active_board_term_id", "updated_at")
SELECT 'singleton', "id", now()
FROM "board_term"
WHERE "name" = 'Zaimportowana kadencja';
--> statement-breakpoint
ALTER TABLE "role_assignment" ADD COLUMN "board_term_id" text;
--> statement-breakpoint
UPDATE "role_assignment"
SET "board_term_id" = (SELECT "active_board_term_id" FROM "board_settings" WHERE "id" = 'singleton')
WHERE "role_definition_id" IN (
	SELECT "id" FROM "role_definition" WHERE "scope" = 'board'
);
--> statement-breakpoint
ALTER TABLE "board_settings" ADD CONSTRAINT "board_settings_active_board_term_id_board_term_id_fk" FOREIGN KEY ("active_board_term_id") REFERENCES "public"."board_term"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_board_term_id_board_term_id_fk" FOREIGN KEY ("board_term_id") REFERENCES "public"."board_term"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_assignment" DROP CONSTRAINT "role_assignment_single_target_check";
--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_single_target_check" CHECK (num_nonnulls("board_term_id", "section_id", "project_id") <= 1);
