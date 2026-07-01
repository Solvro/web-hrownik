import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { id } from "./columns.helpers";
import { roleScopeEnum } from "./enums";
import { member } from "./members";
import { project } from "./projects";
import { section } from "./sections";

export const roleDefinition = pgTable(
  "role_definition",
  {
    id: id(),
    scope: roleScopeEnum("scope").notNull(),
    name: text("name").notNull(),
    githubTeamSlug: text("github_team_slug"),
    discordRoleId: text("discord_role_id"),
  },
  (table) => [
    unique("role_definition_scope_name_unique").on(table.scope, table.name),
  ],
);

export const permissionGroup = pgTable("permission_group", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const permissionGrant = pgTable(
  "permission_grant",
  {
    id: id(),
    permissionGroupId: text("permission_group_id")
      .notNull()
      .references(() => permissionGroup.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
  },
  (table) => [
    unique("permission_grant_group_resource_action_unique").on(
      table.permissionGroupId,
      table.resource,
      table.action,
    ),
  ],
);

export const roleDefinitionPermissionGroup = pgTable(
  "role_definition_permission_group",
  {
    id: id(),
    roleDefinitionId: text("role_definition_id")
      .notNull()
      .references(() => roleDefinition.id, { onDelete: "cascade" }),
    permissionGroupId: text("permission_group_id")
      .notNull()
      .references(() => permissionGroup.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("role_definition_permission_group_unique").on(
      table.roleDefinitionId,
      table.permissionGroupId,
    ),
  ],
);

export const roleAssignment = pgTable(
  "role_assignment",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    roleDefinitionId: text("role_definition_id")
      .notNull()
      .references(() => roleDefinition.id, { onDelete: "restrict" }),
    // Exactly one of these is set, matching roleDefinition.scope ("section" |
    // "project" | "board"); both null means a board-scoped role. Postgres
    // CHECK constraints can't reach across tables to validate this against
    // roleDefinition.scope, so that part is enforced in the application layer.
    sectionId: text("section_id").references(() => section.id, {
      onDelete: "cascade",
    }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    check(
      "role_assignment_single_target_check",
      sql`NOT (${table.sectionId} IS NOT NULL AND ${table.projectId} IS NOT NULL)`,
    ),
  ],
);
