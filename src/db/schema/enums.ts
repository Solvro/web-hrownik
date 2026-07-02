import { pgEnum } from "drizzle-orm/pg-core";

export const memberStatusEnum = pgEnum("member_status", [
  "new",
  "active",
  "inactive",
  "honorary",
]);

export const emailKindEnum = pgEnum("email_kind", ["login", "notification"]);

export const roleScopeEnum = pgEnum("role_scope", [
  "section",
  "project_team",
  "project",
  "board",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "completed",
  "suspended",
]);

export const projectVisibilityEnum = pgEnum("project_visibility", [
  "internal",
  "public",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "commit",
  "pull_request",
  "issue",
]);
