CREATE TYPE "public"."recruitment_source" AS ENUM('eventownik');--> statement-breakpoint
CREATE TABLE "member_recruitment" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"source" "recruitment_source" NOT NULL,
	"external_participant_id" text,
	"edition" text NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"imported_by_member_id" text,
	CONSTRAINT "member_recruitment_source_external_participant_id_unique" UNIQUE("source","external_participant_id")
);
--> statement-breakpoint
ALTER TABLE "member_recruitment" ADD CONSTRAINT "member_recruitment_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_recruitment" ADD CONSTRAINT "member_recruitment_imported_by_member_id_member_id_fk" FOREIGN KEY ("imported_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;