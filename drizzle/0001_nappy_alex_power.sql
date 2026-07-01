CREATE TYPE "public"."email_kind" AS ENUM('login', 'notification');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'alumni');--> statement-breakpoint
CREATE TYPE "public"."permission_level" AS ENUM('board', 'project_lead', 'member');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'completed', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."project_visibility" AS ENUM('internal', 'public');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('section', 'project', 'board');--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"github_username" text,
	"discord_id" text,
	"facebook_url" text,
	"student_index" text,
	"study_field" text,
	"study_year" integer,
	"study_semester" integer,
	"bio" text,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "member_email" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"email" text NOT NULL,
	"kind" "email_kind" DEFAULT 'notification' NOT NULL,
	"verified_at" timestamp,
	CONSTRAINT "member_email_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "member_section" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"section_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "section_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"visibility" "project_visibility" DEFAULT 'internal' NOT NULL,
	"production_url" text,
	"drive_folder_url" text,
	"report_drive_url" text,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"github_team_slug" text,
	"discord_role_id" text
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"member_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "role_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"role_definition_id" text NOT NULL,
	"section_id" text,
	"project_id" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "role_assignment_single_target_check" CHECK (NOT ("role_assignment"."section_id" IS NOT NULL AND "role_assignment"."project_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "role_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" "role_scope" NOT NULL,
	"name" text NOT NULL,
	"permission_level" "permission_level" NOT NULL,
	"github_team_slug" text,
	"discord_role_id" text,
	CONSTRAINT "role_definition_scope_name_unique" UNIQUE("scope","name")
);
--> statement-breakpoint
CREATE TABLE "project_repository" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"github_repo_full_name" text NOT NULL,
	"github_repo_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_repository_full_name_unique" UNIQUE("github_repo_full_name")
);
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_email" ADD CONSTRAINT "member_email_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_section" ADD CONSTRAINT "member_section_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_section" ADD CONSTRAINT "member_section_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_role_definition_id_role_definition_id_fk" FOREIGN KEY ("role_definition_id") REFERENCES "public"."role_definition"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repository" ADD CONSTRAINT "project_repository_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;