CREATE TABLE "permission_grant" (
	"id" text PRIMARY KEY NOT NULL,
	"permission_group_id" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	CONSTRAINT "permission_grant_group_resource_action_unique" UNIQUE("permission_group_id","resource","action")
);
--> statement-breakpoint
CREATE TABLE "permission_group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "permission_group_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_definition_permission_group" (
	"id" text PRIMARY KEY NOT NULL,
	"role_definition_id" text NOT NULL,
	"permission_group_id" text NOT NULL,
	CONSTRAINT "role_definition_permission_group_unique" UNIQUE("role_definition_id","permission_group_id")
);
--> statement-breakpoint
ALTER TABLE "team_member" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "team_member" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "role_definition_id" text;--> statement-breakpoint
ALTER TABLE "permission_grant" ADD CONSTRAINT "permission_grant_permission_group_id_permission_group_id_fk" FOREIGN KEY ("permission_group_id") REFERENCES "public"."permission_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_definition_permission_group" ADD CONSTRAINT "role_definition_permission_group_role_definition_id_role_definition_id_fk" FOREIGN KEY ("role_definition_id") REFERENCES "public"."role_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_definition_permission_group" ADD CONSTRAINT "role_definition_permission_group_permission_group_id_permission_group_id_fk" FOREIGN KEY ("permission_group_id") REFERENCES "public"."permission_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_role_definition_id_role_definition_id_fk" FOREIGN KEY ("role_definition_id") REFERENCES "public"."role_definition"("id") ON DELETE restrict ON UPDATE no action;