CREATE TABLE "member_hr_note" (
	"member_id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_hr_note" ADD CONSTRAINT "member_hr_note_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "member_hr_note" ("member_id", "content", "updated_at")
SELECT "id", "hr_notes", "updated_at" FROM "member"
WHERE "hr_notes" IS NOT NULL AND btrim("hr_notes") <> '';--> statement-breakpoint
ALTER TABLE "member" DROP COLUMN "hr_notes";